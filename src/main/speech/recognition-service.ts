import { app, WebContents } from 'electron'
import path from 'node:path'
import { Worker } from 'node:worker_threads'
import { SendEnum } from '../../type/ipc-constants'
import type { RecognitionWorkerResponse } from '../../type/conversation'
import { localModelManager } from './local-model-manager'

// 停止识别后自动释放 Whisper Worker 内存的空闲时间
const IDLE_DISPOSE_MS = 3 * 60 * 1000
// 未安装 Whisper 模型时的提示文案
const WHISPER_MODEL_MISSING_MESSAGE = 'Whisper 英文识别模型尚未下载，请先下载模型后再使用语音练习'

/** 本地英文识别服务 */
class RecognitionService {
  // 识别 Worker
  private worker: Worker | null = null
  // 当前接收识别结果的渲染进程
  private responseTarget: WebContents | null = null
  // 空闲释放定时器
  private idleDisposeTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * 获取内置 Silero VAD 模型绝对路径
   * @returns VAD 模型路径
   */
  private getVadModelPath(): string {
    return app.isPackaged
      ? path.join(process.resourcesPath, 'resources', 'asr', 'silero_vad.onnx')
      : path.join(__dirname, '../../resources/asr/silero_vad.onnx')
  }

  /** 清除待执行的空闲释放定时器 */
  private clearIdleDisposeTimer(): void {
    if (this.idleDisposeTimer) {
      clearTimeout(this.idleDisposeTimer)
      this.idleDisposeTimer = null
    }
  }

  /** 在停止识别后安排空闲释放，降低长期常驻内存 */
  private scheduleIdleDispose(): void {
    this.clearIdleDisposeTimer()
    if (!this.worker) {
      return
    }
    this.idleDisposeTimer = setTimeout(() => {
      this.idleDisposeTimer = null
      void this.dispose()
    }, IDLE_DISPOSE_MS)
  }

  /**
   * 创建并复用识别 Worker
   * @param modelDirectory Whisper 模型目录
   * @returns 识别 Worker
   */
  private getWorker(modelDirectory: string): Worker {
    if (this.worker) {
      return this.worker
    }

    // 编译后的识别 Worker 路径
    const workerPath = path.join(__dirname, 'recognition-worker.js')
    this.worker = new Worker(workerPath, {
      workerData: {
        modelDirectory,
        vadModelPath: this.getVadModelPath()
      }
    })
    this.worker.on('message', (response: RecognitionWorkerResponse) => {
      this.forwardResponse(response)
    })
    this.worker.on('error', (error) => {
      this.sendError(error.message)
      this.worker = null
    })
    this.worker.on('exit', () => {
      this.worker = null
    })
    return this.worker
  }

  /**
   * 转发 Worker 识别响应
   * @param response Worker 识别响应
   * @returns 无返回值
   */
  private forwardResponse(response: RecognitionWorkerResponse): void {
    if (!this.responseTarget || this.responseTarget.isDestroyed()) {
      return
    }

    // 识别响应对应的 IPC 通道
    const responseChannelMap: Record<RecognitionWorkerResponse['type'], SendEnum> = {
      ready: SendEnum.RECOGNITION_READY,
      processing: SendEnum.RECOGNITION_PROCESSING,
      final: SendEnum.RECOGNITION_FINAL,
      error: SendEnum.RECOGNITION_ERROR
    }
    this.responseTarget.send(responseChannelMap[response.type], response)
  }

  /**
   * 发送识别服务错误
   * @param message 错误信息
   * @returns 无返回值
   */
  private sendError(message: string): void {
    this.forwardResponse({ type: 'error', message })
  }

  /**
   * 启动英文识别
   * @param responseTarget 接收结果的渲染进程
   * @returns 无返回值
   */
  public start(responseTarget: WebContents): void {
    this.clearIdleDisposeTimer()
    this.responseTarget = responseTarget
    const resolvedModel = localModelManager.resolveModelDirectory('whisper-asr')
    if (!resolvedModel) {
      this.forwardResponse({
        type: 'error',
        code: 'MODEL_MISSING',
        message: WHISPER_MODEL_MISSING_MESSAGE
      })
      return
    }
    this.getWorker(resolvedModel.directory).postMessage({ type: 'start' })
  }

  /**
   * 提交 PCM 音频块
   * @param samples PCM 采样数据
   * @param sampleRate 输入采样率
   * @returns 无返回值
   */
  public acceptAudio(samples: Float32Array, sampleRate: number): void {
    if (!this.worker) {
      return
    }
    // IPC 克隆后的 PCM 底层缓冲区
    const audioBuffer = samples.buffer as ArrayBuffer
    this.worker.postMessage({ type: 'audio', samples, sampleRate }, [audioBuffer])
  }

  /** 停止英文识别 */
  public stop(): void {
    this.worker?.postMessage({ type: 'stop' })
    this.responseTarget = null
    this.scheduleIdleDispose()
  }

  /** 释放识别 Worker */
  public async dispose(): Promise<void> {
    this.clearIdleDisposeTimer()
    this.worker?.postMessage({ type: 'stop' })
    this.responseTarget = null
    // 待释放的 Worker
    const worker = this.worker
    this.worker = null
    if (worker) {
      await worker.terminate()
    }
  }
}

// 全局本地英文识别服务
export const recognitionService = new RecognitionService()
