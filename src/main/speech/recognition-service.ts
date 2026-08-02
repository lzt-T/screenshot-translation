import { app, WebContents } from 'electron'
import path from 'node:path'
import { Worker } from 'node:worker_threads'
import { SendEnum } from '../../type/ipc-constants'
import type { RecognitionWorkerResponse } from '../../type/conversation'

/** 本地实时英文识别服务 */
class RecognitionService {
  // 识别 Worker
  private worker: Worker | null = null
  // 当前接收识别结果的渲染进程
  private responseTarget: WebContents | null = null

  /**
   * 获取英文识别模型目录
   * @returns 模型绝对路径
   */
  private getModelDirectory(): string {
    return app.isPackaged
      ? path.join(
          process.resourcesPath,
          'resources',
          'asr',
          'sherpa-onnx-streaming-zipformer-en-2023-06-26'
        )
      : path.join(__dirname, '../../resources/asr/sherpa-onnx-streaming-zipformer-en-2023-06-26')
  }

  /**
   * 创建并复用识别 Worker
   * @returns 识别 Worker
   */
  private getWorker(): Worker {
    if (this.worker) {
      return this.worker
    }

    // 编译后的识别 Worker 路径
    const workerPath = path.join(__dirname, 'recognition-worker.js')
    this.worker = new Worker(workerPath, {
      workerData: { modelDirectory: this.getModelDirectory() }
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
      partial: SendEnum.RECOGNITION_PARTIAL,
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
   * 启动实时识别
   * @param responseTarget 接收结果的渲染进程
   * @returns 无返回值
   */
  public start(responseTarget: WebContents): void {
    this.responseTarget = responseTarget
    this.getWorker().postMessage({ type: 'start' })
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

  /** 停止实时识别 */
  public stop(): void {
    this.worker?.postMessage({ type: 'stop' })
    this.responseTarget = null
  }

  /** 释放识别 Worker */
  public async dispose(): Promise<void> {
    this.stop()
    // 待释放的 Worker
    const worker = this.worker
    this.worker = null
    if (worker) {
      await worker.terminate()
    }
  }
}

// 全局实时英文识别服务
export const recognitionService = new RecognitionService()
