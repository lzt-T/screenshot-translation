import path from 'node:path'
import { Worker } from 'node:worker_threads'
import type { SpeechAudioResult, SpeechWorkerResponse } from '../../type/speech'
import type { SpeechSettings } from '../../type/speech-settings'
import { localModelManager } from './local-model-manager'

// 未安装 Kokoro 模型时的提示文案
const KOKORO_MODEL_MISSING_MESSAGE =
  'Kokoro 本地语音模型尚未下载，请前往「设置 → 语音与模型」下载，或切换为浏览器语音'

/** 等待中的语音请求 */
interface PendingSpeechRequest {
  /** 成功回调 */
  resolve: (result: SpeechAudioResult) => void
  /** 失败回调 */
  reject: (error: Error) => void
}

/** 本地语音合成服务 */
class SpeechService {
  // 语音 Worker
  private worker: Worker | null = null
  // 下一个请求编号
  private nextRequestId = 1
  // 当前请求编号
  private activeRequestId: number | null = null
  // 等待中的请求映射
  private readonly pendingRequests = new Map<number, PendingSpeechRequest>()

  /**
   * 获取已就绪的 Kokoro 模型目录
   * @returns {string | null} 模型绝对路径
   */
  private getModelDirectory(): string | null {
    return localModelManager.resolveModelDirectory('kokoro-tts')?.directory ?? null
  }

  /**
   * 创建并复用语音 Worker
   * @param {string} modelDirectory 模型目录
   * @returns {Worker} 语音 Worker
   */
  private getWorker(modelDirectory: string): Worker {
    if (this.worker) {
      return this.worker
    }

    // 编译后的 Worker 文件路径
    const workerPath = path.join(__dirname, 'speech-worker.js')
    this.worker = new Worker(workerPath, {
      workerData: {
        modelDirectory
      }
    })
    this.worker.on('message', (response: SpeechWorkerResponse) => {
      this.handleWorkerResponse(response)
    })
    this.worker.on('error', (error) => {
      this.handleWorkerError(error)
    })
    this.worker.on('exit', () => {
      this.worker = null
    })
    return this.worker
  }

  /**
   * 处理 Worker 语音响应
   * @param {SpeechWorkerResponse} response 语音响应
   * @returns {void} 无返回值
   */
  private handleWorkerResponse(response: SpeechWorkerResponse): void {
    // 匹配的等待请求
    const pendingRequest = this.pendingRequests.get(response.requestId)
    if (!pendingRequest) {
      return
    }

    this.pendingRequests.delete(response.requestId)
    if (this.activeRequestId === response.requestId) {
      this.activeRequestId = null
    }

    if (!response.success || !response.audioBuffer) {
      pendingRequest.reject(new Error(response.error || '本地语音生成失败'))
      return
    }

    pendingRequest.resolve({ audioBuffer: response.audioBuffer })
  }

  /**
   * 处理 Worker 运行错误
   * @param {Error} error Worker 错误
   * @returns {void} 无返回值
   */
  private handleWorkerError(error: Error): void {
    this.pendingRequests.forEach((pendingRequest) => {
      pendingRequest.reject(error)
    })
    this.pendingRequests.clear()
    this.activeRequestId = null
    this.worker = null
  }

  /** 预加载并复用本地语音模型（仅在模型已安装时生效） */
  public preload(): void {
    const modelDirectory = this.getModelDirectory()
    if (!modelDirectory) {
      return
    }
    this.getWorker(modelDirectory).postMessage({ type: 'preload' })
  }

  /**
   * 根据语音配置按需预热或释放 Kokoro Worker
   * @param {Partial<SpeechSettings> | null} speech 当前语音配置
   * @returns {void} 无返回值
   */
  public syncWithSpeechSettings(speech?: Partial<SpeechSettings> | null): void {
    if (speech?.source === 'kokoro' && this.getModelDirectory()) {
      this.preload()
      return
    }
    void this.dispose()
  }

  /**
   * 异步合成完整语音
   * @param {string} text 待朗读文本
   * @returns {Promise<SpeechAudioResult>} WAV 音频
   */
  public synthesize(text: string, speakerId?: number): Promise<SpeechAudioResult> {
    const modelDirectory = this.getModelDirectory()
    if (!modelDirectory) {
      return Promise.reject(new Error(KOKORO_MODEL_MISSING_MESSAGE))
    }

    this.cancel()
    // 当前请求编号
    const requestId = this.nextRequestId
    this.nextRequestId += 1
    this.activeRequestId = requestId

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject })
      this.getWorker(modelDirectory).postMessage({ type: 'synthesize', requestId, text, speakerId })
    })
  }

  /**
   * 取消当前语音生成
   * @returns {void} 无返回值
   */
  public cancel(): void {
    if (this.activeRequestId === null) {
      return
    }

    // 被取消的请求编号
    const requestId = this.activeRequestId
    // 被取消的等待请求
    const pendingRequest = this.pendingRequests.get(requestId)
    this.worker?.postMessage({ type: 'cancel', requestId })
    this.pendingRequests.delete(requestId)
    this.activeRequestId = null
    pendingRequest?.reject(new Error('语音生成已取消'))
  }

  /**
   * 释放语音 Worker
   * @returns {Promise<void>} 无返回值
   */
  public async dispose(): Promise<void> {
    this.cancel()
    // 待释放的 Worker
    const worker = this.worker
    this.worker = null
    if (worker) {
      await worker.terminate()
    }
  }
}

// 全局本地语音服务
export const speechService = new SpeechService()
