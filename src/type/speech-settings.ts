/** 语音来源 */
export type SpeechSource = 'browser' | 'kokoro' | 'third-party'
/** 第三方服务商 */
export type SpeechProvider = 'mimo' | 'openai' | 'azure-speech' | 'elevenlabs' | 'aliyun-bailian'
/** 单个第三方服务配置 */
export interface SpeechProviderConfig {
  endpoint: string
  apiKey: string
  model: string
  voice: string
}
/** 持久化语音设置 */
export interface SpeechSettings {
  source: SpeechSource
  browserVoice: string
  kokoroVoice: string
  provider: SpeechProvider
  providers: Record<SpeechProvider, SpeechProviderConfig>
}
/** 语音请求快照 */
export interface SpeechSynthesisRequest {
  text: string
  settings: SpeechSettings
}
