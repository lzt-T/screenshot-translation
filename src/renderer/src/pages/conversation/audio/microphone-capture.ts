/** 麦克风 PCM 数据回调 */
export type AudioChunkHandler = (samples: Float32Array, sampleRate: number) => void

/** 浏览器麦克风采集器 */
export class MicrophoneCapture {
  // 麦克风媒体流
  private mediaStream: MediaStream | null = null
  // Web Audio 上下文
  private audioContext: AudioContext | null = null
  // 麦克风输入节点
  private sourceNode: MediaStreamAudioSourceNode | null = null
  // PCM 采集节点
  private workletNode: AudioWorkletNode | null = null
  // 静音输出节点
  private silentGainNode: GainNode | null = null

  /**
   * 开始采集麦克风 PCM
   * @param handleAudioChunk PCM 数据回调
   * @returns 启动完成任务
   */
  public async start(handleAudioChunk: AudioChunkHandler): Promise<void> {
    this.stop()
    // 带语音优化约束的麦克风流
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    })

    try {
      // 优先使用识别模型采样率的音频上下文
      const audioContext = new AudioContext({ sampleRate: 16000 })
      // PCM Worklet 模块地址
      const workletModuleUrl = new URL('./pcm-capture-processor.js', import.meta.url)
      await audioContext.audioWorklet.addModule(workletModuleUrl)

      // 麦克风音频源
      const sourceNode = audioContext.createMediaStreamSource(mediaStream)
      // PCM 音频处理节点
      const workletNode = new AudioWorkletNode(audioContext, 'pcm-capture-processor')
      // 防止采集音频从扬声器播放的静音节点
      const silentGainNode = audioContext.createGain()
      silentGainNode.gain.value = 0

      workletNode.port.onmessage = (event: MessageEvent<Float32Array>) => {
        handleAudioChunk(event.data, audioContext.sampleRate)
      }
      sourceNode.connect(workletNode)
      workletNode.connect(silentGainNode)
      silentGainNode.connect(audioContext.destination)

      this.mediaStream = mediaStream
      this.audioContext = audioContext
      this.sourceNode = sourceNode
      this.workletNode = workletNode
      this.silentGainNode = silentGainNode
    } catch (error) {
      mediaStream.getTracks().forEach((track) => track.stop())
      throw error
    }
  }

  /** 停止采集并释放麦克风资源 */
  public stop(): void {
    this.workletNode?.disconnect()
    this.sourceNode?.disconnect()
    this.silentGainNode?.disconnect()
    this.mediaStream?.getTracks().forEach((track) => track.stop())
    if (this.audioContext) {
      void this.audioContext.close()
    }
    this.mediaStream = null
    this.audioContext = null
    this.sourceNode = null
    this.workletNode = null
    this.silentGainNode = null
  }
}
