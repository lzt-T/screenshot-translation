import { app, BrowserWindow, net } from 'electron'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { SendEnum } from '../../type/ipc-constants'
import type {
  LocalModelDownloadSourceSetting,
  LocalModelId,
  LocalModelSourceKind,
  LocalModelState
} from '../../type/local-model'
import {
  LOCAL_MODEL_DEFINITIONS,
  LOCAL_MODEL_IDS,
  type LocalModelDefinition,
  resolveModelDownloadUrl,
  validateModelDownloadUrl
} from '../../utils/local-models'
import { getErrorMessage } from '../utils/error'

// Git LFS 指针文件的固定开头
const GIT_LFS_POINTER_PREFIX = 'version https://git-lfs.github.com/spec/v1'
// 触发 LFS 指针头检查的文件体积阈值
const LFS_CHECK_MIN_BYTES = 1024 * 1024
// 下载进度广播的最小时间间隔（毫秒）
const PROGRESS_BROADCAST_INTERVAL_MS = 120

/** 已就绪的模型目录解析结果 */
export interface ResolvedLocalModelDirectory {
  /** 模型目录绝对路径 */
  directory: string
  /** 模型来源类型 */
  sourceKind: LocalModelSourceKind
}

/**
 * 读取文件开头并校验是否为无效的 Git LFS 指针文件
 * @param filePath 文件路径
 * @returns 是否为 LFS 指针
 */
function isGitLfsPointerFile(filePath: string): boolean {
  const headerBuffer = Buffer.alloc(64)
  const fileDescriptor = fs.openSync(filePath, 'r')
  try {
    const bytesRead = fs.readSync(fileDescriptor, headerBuffer, 0, headerBuffer.length, 0)
    return headerBuffer.subarray(0, bytesRead).toString('utf8').startsWith(GIT_LFS_POINTER_PREFIX)
  } finally {
    fs.closeSync(fileDescriptor)
  }
}

/**
 * 使用系统内置 tar 解压 .tar.bz2 模型压缩包
 * @param archivePath 压缩包路径
 * @param targetDirectory 解压目标目录
 * @param signal 取消信号
 */
function extractTarBz2Archive(
  archivePath: string,
  targetDirectory: string,
  signal: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error('模型下载已取消'))
      return
    }

    const tarProcess = spawn('tar', ['-xjf', archivePath, '-C', targetDirectory], {
      windowsHide: true
    })
    let stderrOutput = ''
    let settled = false

    const handleAbort = (): void => {
      if (!settled) {
        tarProcess.kill()
      }
    }

    const cleanup = (): void => {
      signal.removeEventListener('abort', handleAbort)
    }

    signal.addEventListener('abort', handleAbort, { once: true })

    tarProcess.stderr?.on('data', (chunk: Buffer) => {
      if (stderrOutput.length < 1024) {
        stderrOutput += chunk.toString('utf8')
      }
    })

    tarProcess.on('error', (error) => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error(`解压模型失败，无法启动系统 tar 工具：${error.message}`))
    })

    tarProcess.on('close', (code) => {
      if (settled) return
      settled = true
      cleanup()
      if (signal.aborted) {
        reject(new Error('模型下载已取消'))
        return
      }
      if (code !== 0) {
        const detail = stderrOutput.trim()
        reject(new Error(detail ? `解压模型失败：${detail}` : `解压模型失败（退出码 ${code ?? '未知'}）`))
        return
      }
      resolve()
    })
  })
}

/**
 * 将解压后的模型目录移动到正式目录（跨设备时回退到复制）
 * @param sourceDirectory 源目录
 * @param targetDirectory 目标目录
 */
async function moveDirectoryIntoPlace(sourceDirectory: string, targetDirectory: string): Promise<void> {
  await fs.promises.mkdir(path.dirname(targetDirectory), { recursive: true })
  if (fs.existsSync(targetDirectory)) {
    await fs.promises.rm(targetDirectory, { recursive: true, force: true })
  }

  try {
    await fs.promises.rename(sourceDirectory, targetDirectory)
  } catch (error) {
    const errorCode = (error as NodeJS.ErrnoException)?.code
    if (errorCode !== 'EXDEV' && errorCode !== 'EPERM') {
      throw error
    }
    await fs.promises.cp(sourceDirectory, targetDirectory, { recursive: true, force: true })
    await fs.promises.rm(sourceDirectory, { recursive: true, force: true })
  }
}

/** 管理本地按需模型的路径解析、下载、解压校验与清理 */
class LocalModelManager {
  // 进行中或最近失败的运行时状态
  private readonly runtimeStates = new Map<LocalModelId, LocalModelState>()
  // 活动下载任务的取消控制器
  private readonly activeAbortControllers = new Map<LocalModelId, AbortController>()

  /**
   * 获取用户数据目录下的模型路径
   * @param definition 模型定义
   * @returns 用户数据模型目录
   */
  private getUserDataModelDirectory(definition: LocalModelDefinition): string {
    return path.join(
      app.getPath('userData'),
      'models',
      definition.categoryDir,
      definition.folderName
    )
  }

  /**
   * 获取兼容内置或开发环境 resources 目录下的模型路径
   * @param definition 模型定义
   * @returns 兼容目录路径
   */
  private getCompatModelDirectory(definition: LocalModelDefinition): string {
    return app.isPackaged
      ? path.join(process.resourcesPath, 'resources', definition.categoryDir, definition.folderName)
      : path.join(__dirname, '../../resources', definition.categoryDir, definition.folderName)
  }

  /**
   * 校验目录是否包含完整的必需模型文件
   * @param directory 模型目录
   * @param definition 模型定义
   * @returns 是否完整可用
   */
  public isModelDirectoryComplete(directory: string, definition: LocalModelDefinition): boolean {
    if (!fs.existsSync(directory)) {
      return false
    }

    try {
      for (const requirement of definition.requiredFiles) {
        const filePath = path.join(directory, requirement.relativePath)
        if (!fs.existsSync(filePath)) {
          return false
        }
        const stat = fs.statSync(filePath)
        if (!stat.isFile() || stat.size < requirement.minSizeBytes) {
          return false
        }
        if (requirement.minSizeBytes >= LFS_CHECK_MIN_BYTES && isGitLfsPointerFile(filePath)) {
          return false
        }
      }
      return true
    } catch {
      return false
    }
  }

  /**
   * 解析指定模型当前可用的本地目录（优先 userData，其次兼容 resources）
   * @param id 模型标识
   * @returns 可用目录及来源类型；不可用时返回 null
   */
  public resolveModelDirectory(id: LocalModelId): ResolvedLocalModelDirectory | null {
    const definition = LOCAL_MODEL_DEFINITIONS[id]
    const userDataDirectory = this.getUserDataModelDirectory(definition)
    if (this.isModelDirectoryComplete(userDataDirectory, definition)) {
      return {
        directory: userDataDirectory,
        sourceKind: 'user-data'
      }
    }

    const compatDirectory = this.getCompatModelDirectory(definition)
    if (this.isModelDirectoryComplete(compatDirectory, definition)) {
      return {
        directory: compatDirectory,
        sourceKind: 'bundled-compat'
      }
    }

    return null
  }

  /**
   * 基于当前磁盘文件生成静态模型状态
   * @param id 模型标识
   * @returns 安装状态对象
   */
  private createDiskModelState(id: LocalModelId): LocalModelState {
    const resolved = this.resolveModelDirectory(id)
    if (resolved) {
      return {
        id,
        status: 'installed',
        sourceKind: resolved.sourceKind,
        downloadedBytes: 0,
        totalBytes: 0,
        progress: 100,
        installedPath: resolved.directory
      }
    }

    return {
      id,
      status: 'not-installed',
      sourceKind: null,
      downloadedBytes: 0,
      totalBytes: 0,
      progress: 0
    }
  }

  /**
   * 获取指定模型当前状态
   * @param id 模型标识
   * @returns 模型状态
   */
  public getModelState(id: LocalModelId): LocalModelState {
    const runtimeState = this.runtimeStates.get(id)
    if (runtimeState) {
      return runtimeState
    }
    return this.createDiskModelState(id)
  }

  /**
   * 获取全部按需模型状态列表
   * @returns 模型状态列表
   */
  public getAllStates(): LocalModelState[] {
    return LOCAL_MODEL_IDS.map((id) => this.getModelState(id))
  }

  /**
   * 向所有未销毁窗口广播本地模型状态变更
   * @param state 最新模型状态
   */
  private broadcastState(state: LocalModelState): void {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) {
        window.webContents.send(SendEnum.LOCAL_MODEL_STATE_CHANGED, state)
      }
    }
  }

  /**
   * 更新运行时状态并广播到渲染进程
   * @param state 最新模型状态
   */
  private setRuntimeState(state: LocalModelState): void {
    this.runtimeStates.set(state.id, state)
    this.broadcastState(state)
  }

  /**
   * 从已解压缩目录定位合法的模型根目录
   * @param extractDirectory 解压根目录
   * @param definition 模型定义
   * @returns 校验通过的模型目录；不完整时返回 null
   */
  private locateExtractedModelDirectory(
    extractDirectory: string,
    definition: LocalModelDefinition
  ): string | null {
    const nestedDirectory = path.join(extractDirectory, definition.folderName)
    if (this.isModelDirectoryComplete(nestedDirectory, definition)) {
      return nestedDirectory
    }
    if (this.isModelDirectoryComplete(extractDirectory, definition)) {
      return extractDirectory
    }
    return null
  }

  /**
   * 下载并解压安装指定模型到 userData 目录
   * @param id 模型标识
   * @param sourceSetting 下载源配置
   * @param onBeforeReplace 替换目标目录前的资源释放回调
   * @returns 安装或取消后的最新模型状态
   */
  public async downloadModel(
    id: LocalModelId,
    sourceSetting?: Partial<LocalModelDownloadSourceSetting> | null,
    onBeforeReplace?: () => Promise<void>
  ): Promise<LocalModelState> {
    const definition = LOCAL_MODEL_DEFINITIONS[id]
    if (this.activeAbortControllers.has(id)) {
      throw new Error(`${definition.name}正在下载中，请稍候`)
    }

    const downloadUrl = resolveModelDownloadUrl(id, sourceSetting)
    const validationError = validateModelDownloadUrl(downloadUrl)
    if (validationError) {
      throw new Error(validationError)
    }

    const controller = new AbortController()
    this.activeAbortControllers.set(id, controller)

    const tempDirectory = path.join(
      app.getPath('userData'),
      'models',
      '.tmp',
      `${id}-${Date.now()}`
    )
    const archivePath = path.join(tempDirectory, definition.archiveFileName)
    const extractDirectory = path.join(tempDirectory, 'extracted')

    let downloadedBytes = 0
    let totalBytes = 0

    try {
      await fs.promises.mkdir(extractDirectory, { recursive: true })
      this.setRuntimeState({
        id,
        status: 'downloading',
        sourceKind: null,
        downloadedBytes: 0,
        totalBytes: 0,
        progress: 0
      })

      const response = await net.fetch(downloadUrl, {
        signal: controller.signal,
        redirect: 'follow'
      })
      if (!response.ok || !response.body) {
        throw new Error(`模型下载失败（HTTP ${response.status}），请检查网络、代理或切换下载源`)
      }

      const contentLength = Number(response.headers.get('content-length') || 0)
      totalBytes = Number.isFinite(contentLength) && contentLength > 0 ? contentLength : 0

      await this.writeResponseBodyToFile(
        response.body,
        archivePath,
        controller.signal,
        (writtenBytes) => {
          downloadedBytes = writtenBytes
          const progress =
            totalBytes > 0 ? Math.min(99, Math.round((writtenBytes / totalBytes) * 100)) : 0
          this.setRuntimeState({
            id,
            status: 'downloading',
            sourceKind: null,
            downloadedBytes: writtenBytes,
            totalBytes,
            progress
          })
        }
      )

      if (controller.signal.aborted) {
        this.runtimeStates.delete(id)
        const restoredState = this.createDiskModelState(id)
        this.broadcastState(restoredState)
        return restoredState
      }

      this.setRuntimeState({
        id,
        status: 'extracting',
        sourceKind: null,
        downloadedBytes,
        totalBytes: totalBytes || downloadedBytes,
        progress: 100
      })

      await extractTarBz2Archive(archivePath, extractDirectory, controller.signal)
      const extractedModelDirectory = this.locateExtractedModelDirectory(extractDirectory, definition)
      if (!extractedModelDirectory) {
        throw new Error('解压后的模型文件不完整，请检查下载地址或重新下载')
      }

      // Windows 下必须在覆盖目标目录前释放 Worker 持有的 ONNX 文件句柄
      await onBeforeReplace?.()

      const targetDirectory = this.getUserDataModelDirectory(definition)
      await moveDirectoryIntoPlace(extractedModelDirectory, targetDirectory)
      if (!this.isModelDirectoryComplete(targetDirectory, definition)) {
        throw new Error('模型安装校验未通过，请重新下载')
      }

      this.runtimeStates.delete(id)
      const installedState = this.createDiskModelState(id)
      this.broadcastState(installedState)
      return installedState
    } catch (error) {
      if (controller.signal.aborted) {
        this.runtimeStates.delete(id)
        const restoredState = this.createDiskModelState(id)
        this.broadcastState(restoredState)
        return restoredState
      }

      const errorMessage = getErrorMessage(error)
      this.setRuntimeState({
        id,
        status: 'error',
        sourceKind: null,
        downloadedBytes,
        totalBytes,
        progress: 0,
        error: errorMessage
      })
      throw new Error(errorMessage)
    } finally {
      this.activeAbortControllers.delete(id)
      await fs.promises.rm(tempDirectory, { recursive: true, force: true }).catch(() => undefined)
    }
  }

  /**
   * 将 fetch 响应流写入本地压缩包并按节流频率上报字节进度
   * @param body 响应体流
   * @param filePath 目标文件路径
   * @param signal 取消信号
   * @param onProgress 进度回调
   */
  private async writeResponseBodyToFile(
    body: NonNullable<Awaited<ReturnType<typeof net.fetch>>['body']>,
    filePath: string,
    signal: AbortSignal,
    onProgress: (downloadedBytes: number) => void
  ): Promise<void> {
    const reader = body.getReader()
    const writeStream = fs.createWriteStream(filePath)
    let downloadedBytes = 0
    let lastBroadcastAt = 0

    const handleAbort = (): void => {
      void reader.cancel().catch(() => undefined)
      writeStream.destroy()
    }
    signal.addEventListener('abort', handleAbort, { once: true })

    try {
      while (true) {
        if (signal.aborted) {
          break
        }
        const { done, value } = await reader.read()
        if (done) {
          break
        }
        if (value && value.byteLength > 0) {
          if (!writeStream.write(value)) {
            await new Promise<void>((resolve, reject) => {
              const onDrain = (): void => {
                writeStream.off('error', onError)
                resolve()
              }
              const onError = (err: Error): void => {
                writeStream.off('drain', onDrain)
                reject(err)
              }
              writeStream.once('drain', onDrain)
              writeStream.once('error', onError)
            })
          }
          downloadedBytes += value.byteLength
          const now = Date.now()
          if (now - lastBroadcastAt >= PROGRESS_BROADCAST_INTERVAL_MS) {
            lastBroadcastAt = now
            onProgress(downloadedBytes)
          }
        }
      }

      if (!signal.aborted) {
        await new Promise<void>((resolve, reject) => {
          writeStream.end((error?: Error | null) => {
            if (error) reject(error)
            else resolve()
          })
        })
        onProgress(downloadedBytes)
      }
    } finally {
      signal.removeEventListener('abort', handleAbort)
      reader.releaseLock()
      if (!writeStream.closed) {
        writeStream.destroy()
      }
    }
  }

  /**
   * 取消指定模型的下载任务
   * @param id 模型标识
   * @returns 最新模型状态
   */
  public cancelDownload(id: LocalModelId): LocalModelState {
    const controller = this.activeAbortControllers.get(id)
    if (controller) {
      controller.abort()
      return this.getModelState(id)
    }

    if (this.runtimeStates.get(id)?.status === 'error') {
      this.runtimeStates.delete(id)
    }
    const state = this.createDiskModelState(id)
    this.broadcastState(state)
    return state
  }

  /** 取消所有活动中的模型下载 */
  public cancelAll(): void {
    for (const controller of this.activeAbortControllers.values()) {
      controller.abort()
    }
  }

  /**
   * 删除用户数据目录中已下载的指定模型
   * @param id 模型标识
   * @param onBeforeRemove 删除前释放占用该模型的 Worker 回调
   * @returns 删除后的最新模型状态
   */
  public async removeModel(
    id: LocalModelId,
    onBeforeRemove?: () => Promise<void>
  ): Promise<LocalModelState> {
    if (this.activeAbortControllers.has(id)) {
      throw new Error('模型正在下载或解压，请先取消后再删除')
    }

    const definition = LOCAL_MODEL_DEFINITIONS[id]
    const userDataDirectory = this.getUserDataModelDirectory(definition)
    if (!fs.existsSync(userDataDirectory)) {
      this.runtimeStates.delete(id)
      const state = this.createDiskModelState(id)
      this.broadcastState(state)
      return state
    }

    await onBeforeRemove?.()
    await fs.promises.rm(userDataDirectory, { recursive: true, force: true })
    this.runtimeStates.delete(id)
    const nextState = this.createDiskModelState(id)
    this.broadcastState(nextState)
    return nextState
  }
}

/** 全局本地模型管理器实例 */
export const localModelManager = new LocalModelManager()
