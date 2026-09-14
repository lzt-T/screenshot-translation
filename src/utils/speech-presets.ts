import type { SpeechProvider, SpeechProviderConfig } from '../type/speech-settings'

/** 服务商已核实的模型与音色目录；空目录不限制自定义值 */
interface SpeechPresetCatalog {
  models: Record<string, readonly string[]>
  voices?: readonly string[]
}

// MiMo 预置音色，来源见 OpenSpec design.md 的目录核对记录
const MIMO_VOICES = ['mimo_default', '冰糖', '白桦', 'Mia', 'Chloe', 'Milo', 'Dean']
// 官方 SDK 中确认的内置音色，供 mini TTS 系列选择
const OPENAI_VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer', 'verse', 'marin', 'cedar']
// 百炼常用音色；旧快照的差异在模型映射中单独列出
const QWEN_VOICES = ['Cherry', 'Serena', 'Ethan', 'Chelsie']
// 静态预置仅列当前适配器已确认支持的模型，不在设置页请求远程目录
const SPEECH_PRESETS: Record<SpeechProvider, SpeechPresetCatalog> = {
  mimo: { models: { 'mimo-v2.5-tts': MIMO_VOICES } },
  openai: { models: { 'gpt-4o-mini-tts': OPENAI_VOICES, 'gpt-4o-mini-tts-2025-12-15': OPENAI_VOICES } },
  'azure-speech': {
    models: {},
    voices: ['en-US-JennyNeural', 'en-US-GuyNeural', 'zh-CN-XiaoxiaoNeural', 'zh-CN-YunxiNeural']
  },
  elevenlabs: { models: { eleven_multilingual_v2: [], eleven_flash_v2_5: [] } },
  'aliyun-bailian': {
    models: {
      'qwen3-tts-flash': QWEN_VOICES,
      'qwen3-tts-flash-2025-11-27': QWEN_VOICES,
      'qwen3-tts-flash-2025-09-18': ['Cherry', 'Ethan']
    }
  }
}

/** 按字段和当前模型取得下拉选项，undefined 表示保留普通输入框 */
export function getSpeechPresetOptions(provider: SpeechProvider, field: keyof SpeechProviderConfig, model: string): readonly string[] | undefined {
  // 当前服务的目录
  const catalog = SPEECH_PRESETS[provider]
  if (field === 'model') return Object.keys(catalog.models)
  if (field !== 'voice' || provider === 'elevenlabs') return undefined
  return catalog.voices ?? (Object.hasOwn(catalog.models, model) ? catalog.models[model] : [])
}

/** 只拒绝目录中已知不兼容的组合，未知自定义值留给服务端验证 */
export function getSpeechVoiceCompatibilityMessage(provider: SpeechProvider, config: SpeechProviderConfig): string {
  // 当前模型已确认支持的音色
  const catalog = SPEECH_PRESETS[provider]
  // 与合成适配器保持相同的首尾空白处理
  const model = config.model.trim()
  // 用户手动输入的实际音色值
  const voice = config.voice.trim()
  if (!Object.hasOwn(catalog.models, model)) return ''
  // 是否为该服务目录内已知音色
  const isKnownVoice = Object.values(catalog.models).some((voices) => voices.includes(voice))
  return isKnownVoice && !catalog.models[model].includes(voice)
    ? '当前模型不支持此音色，请重新选择音色'
    : ''
}
