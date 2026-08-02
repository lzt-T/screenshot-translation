// 单次发送的 PCM 采样数量
const PCM_CHUNK_SIZE = 2048

/** 将麦克风采样整理为稳定大小的 PCM 数据块 */
class PcmCaptureProcessor extends AudioWorkletProcessor {
  /** 初始化 PCM 缓冲区 */
  constructor() {
    super()
    // 等待发送的 PCM 采样
    this.pendingSamples = new Float32Array(PCM_CHUNK_SIZE)
    // PCM 缓冲区写入位置
    this.writeOffset = 0
  }

  /**
   * 接收一帧麦克风音频
   * @param {Float32Array[][]} inputs 输入音频
   * @returns {boolean} 是否继续处理
   */
  process(inputs) {
    // 首个输入节点的单声道采样
    const inputSamples = inputs[0]?.[0]
    if (!inputSamples) {
      return true
    }

    // 当前输入采样索引
    let inputOffset = 0
    while (inputOffset < inputSamples.length) {
      // 当前可复制的采样数量
      const copyLength = Math.min(
        PCM_CHUNK_SIZE - this.writeOffset,
        inputSamples.length - inputOffset
      )
      this.pendingSamples.set(
        inputSamples.subarray(inputOffset, inputOffset + copyLength),
        this.writeOffset
      )
      inputOffset += copyLength
      this.writeOffset += copyLength

      if (this.writeOffset === PCM_CHUNK_SIZE) {
        // 可转移给页面线程的完整 PCM 数据块
        const completedChunk = this.pendingSamples
        this.port.postMessage(completedChunk, [completedChunk.buffer])
        this.pendingSamples = new Float32Array(PCM_CHUNK_SIZE)
        this.writeOffset = 0
      }
    }

    return true
  }
}

registerProcessor('pcm-capture-processor', PcmCaptureProcessor)
