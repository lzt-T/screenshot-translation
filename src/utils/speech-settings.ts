import type { SpeechProvider, SpeechProviderConfig, SpeechSettings, SpeechSource } from '../type/speech-settings'
import { getSpeechVoiceCompatibilityMessage } from './speech-presets'

// 来源名称与说明
export const SPEECH_SOURCES: Record<SpeechSource, { label: string; description: string }> = {
  browser: { label: '浏览器语音', description: '启动通常较快，音色取决于当前系统。' },
  kokoro: { label: 'Kokoro 本地语音', description: '本地合成，支持离线朗读。' },
  'third-party': { label: '第三方语音服务', description: '联网生成，所读文本将发送给选中的服务商，可能产生费用。' }
}
/** 第三方字段说明 */
interface SpeechProviderDefinition {
  label: string
  defaults: SpeechProviderConfig
  fields: (keyof SpeechProviderConfig)[]
  help: string
}
// 官方协议对应的默认配置，地址为完整合成端点
export const SPEECH_PROVIDERS: Record<SpeechProvider, SpeechProviderDefinition> = {
  mimo: {
    label: 'MiMo', fields: ['endpoint', 'apiKey', 'model', 'voice'],
    defaults: { endpoint: 'https://api.xiaomimimo.com/v1/chat/completions', apiKey: '', model: 'mimo-v2.5-tts', voice: 'Mia' },
    help: '选择预置模型与音色，也可填写自定义值；不支持音色克隆或设计模型。'
  },
  openai: {
    label: 'OpenAI', fields: ['endpoint', 'apiKey', 'model', 'voice'],
    defaults: { endpoint: 'https://api.openai.com/v1/audio/speech', apiKey: '', model: 'gpt-4o-mini-tts', voice: 'alloy' },
    help: '使用官方语音接口及模型支持的音色，如 alloy、coral。'
  },
  'azure-speech': {
    label: 'Azure Speech', fields: ['endpoint', 'apiKey', 'voice'],
    defaults: { endpoint: '', apiKey: '', model: '', voice: 'en-US-JennyNeural' },
    help: '填写资源所在地域的完整端点，例如 https://eastus.tts.speech.microsoft.com/cognitiveservices/v1；密钥须属于对应资源。'
  },
  elevenlabs: {
    label: 'ElevenLabs', fields: ['endpoint', 'apiKey', 'model', 'voice'],
    defaults: { endpoint: 'https://api.elevenlabs.io/v1/text-to-speech', apiKey: '', model: 'eleven_multilingual_v2', voice: '' },
    help: '音色填写账号可用的 Voice ID；接口地址不包含 Voice ID。'
  },
  'aliyun-bailian': {
    label: '阿里云百炼', fields: ['endpoint', 'apiKey', 'model', 'voice'],
    defaults: { endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', apiKey: '', model: 'qwen3-tts-flash', voice: 'Cherry' },
    help: '使用非实时 Qwen-TTS；端点与 API Key 须属于相同地域，默认端点为北京。'
  }
}
// 配置字段显示名称
export const SPEECH_FIELD_LABELS: Record<keyof SpeechProviderConfig, string> = {
  endpoint: 'API 地址', apiKey: 'API Key', model: '模型', voice: '音色'
}

/** 创建互不共享可变对象的缺省语音配置 */
export function createDefaultSpeechSettings(): SpeechSettings {
  return {
    source: 'kokoro', browserVoice: 'auto', kokoroVoice: 'auto', provider: 'mimo',
    providers: Object.fromEntries(Object.entries(SPEECH_PROVIDERS).map(([key, definition]) => [key, { ...definition.defaults }])) as SpeechSettings['providers']
  }
}

/** 读取旧配置时补齐缺省字段与独立服务配置 */
export function normalizeSpeechSettings(value: Partial<SpeechSettings> | null): SpeechSettings {
  // 完整默认值
  const defaults = createDefaultSpeechSettings()
  return {
    ...defaults, ...value,
    source: value?.source && Object.hasOwn(SPEECH_SOURCES, value.source) ? value.source : defaults.source,
    provider: value?.provider && Object.hasOwn(SPEECH_PROVIDERS, value.provider) ? value.provider : defaults.provider,
    providers: Object.fromEntries(Object.entries(defaults.providers).map(([key, config]) => [key, { ...config, ...value?.providers?.[key as SpeechProvider] }])) as SpeechSettings['providers']
  }
}

/** 返回当前来源的首个配置错误，非当前服务不参与校验 */
export function getSpeechValidationMessage(settings: SpeechSettings): string {
  if (settings.source !== 'third-party') return ''
  // 当前服务字段与配置
  const definition = SPEECH_PROVIDERS[settings.provider]
  // 当前服务配置
  const config = settings.providers[settings.provider]
  // 首个缺少的必填字段
  const missingField = definition.fields.find((field) => !config[field]?.trim())
  if (missingField) return `请填写${SPEECH_FIELD_LABELS[missingField]}`
  try {
    // 完整请求地址
    const endpoint = new URL(config.endpoint)
    if (!['https:', 'http:'].includes(endpoint.protocol) || endpoint.username || endpoint.password) return '请填写有效的 HTTP 或 HTTPS API 地址'
  } catch { return '请填写有效的 HTTP 或 HTTPS API 地址' }
  if (settings.provider === 'mimo' && /voiceclone|voicedesign/.test(config.model)) return '请选择 MiMo 预置音色 TTS 模型'
  return getSpeechVoiceCompatibilityMessage(settings.provider, config)
}
