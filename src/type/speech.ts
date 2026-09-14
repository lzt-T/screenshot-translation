/** 语音合成结果 */
export interface SpeechAudioResult {
  /** WAV 音频数据 */
  audioBuffer: ArrayBuffer
  /** 音频媒体类型；本地模型默认为 WAV */
  mimeType?: string
}

/** 语音 Worker 预加载消息 */
export interface SpeechPreloadMessage {
  /** 消息类型 */
  type: 'preload'
}

/** 语音 Worker 合成消息 */
export interface SpeechSynthesizeMessage {
  /** 消息类型 */
  type: 'synthesize'
  /** 请求编号 */
  requestId: number
  /** 待朗读文本 */
  text: string
  /** 指定音色，为空时按语言选择 */
  speakerId?: number
}

/** 语音 Worker 取消消息 */
export interface SpeechCancelMessage {
  /** 消息类型 */
  type: 'cancel'
  /** 请求编号 */
  requestId: number
}

/** 语音 Worker 请求消息 */
export type SpeechWorkerRequest =
  | SpeechPreloadMessage
  | SpeechSynthesizeMessage
  | SpeechCancelMessage

/** 语音 Worker 响应消息 */
export interface SpeechWorkerResponse {
  /** 请求编号 */
  requestId: number
  /** 请求是否成功 */
  success: boolean
  /** WAV 音频数据 */
  audioBuffer?: ArrayBuffer
  /** 错误信息 */
  error?: string
}
