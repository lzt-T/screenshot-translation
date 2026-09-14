import { net } from 'electron'
import type { SpeechAudioResult } from '../../type/speech'
import type { SpeechProvider, SpeechProviderConfig, SpeechSynthesisRequest } from '../../type/speech-settings'
import { getSpeechValidationMessage, SPEECH_PROVIDERS } from '../../utils/speech-settings'

/** 单次服务请求上下文 */
interface SpeechRequestContext {
  text: string
  config: SpeechProviderConfig
  signal: AbortSignal
}

/** 检查服务状态，不向界面传播可能包含凭据的响应正文 */
function checkResponse(response: Response): Response {
  if (!response.ok) throw new Error(`语音服务请求失败（HTTP ${response.status}），请检查凭据、额度和服务配置`)
  return response
}

/** 通过 Electron 网络栈发送 JSON，复用默认会话的代理设置 */
async function postJson(context: SpeechRequestContext, body: unknown, headers: Record<string, string>): Promise<Response> {
  return checkResponse(await net.fetch(context.config.endpoint.trim(), {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body), signal: context.signal, redirect: 'error'
  }))
}

/** 校验音频数据头，阻止成功状态中的 JSON 或 HTML 被当成音频 */
function createAudioResult(bytes: Uint8Array): SpeechAudioResult {
  // 常见容器与帧同步标记
  const header = String.fromCharCode(...bytes.subarray(0, 12))
  // WAV 容器标识
  const isWave = header.startsWith('RIFF') && header.slice(8) === 'WAVE'
  // MP3 标签或 MPEG 帧标识
  const isMp3 = header.startsWith('ID3') || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)
  if (!isWave && !isMp3) throw new Error('语音服务未返回有效的 WAV 或 MP3 音频')
  return { audioBuffer: Uint8Array.from(bytes).buffer, mimeType: isWave ? 'audio/wav' : 'audio/mpeg' }
}

/** 读取完整音频响应 */
async function readAudio(response: Response): Promise<SpeechAudioResult> {
  return createAudioResult(new Uint8Array(await checkResponse(response).arrayBuffer()))
}

/** 使用 MiMo 的 assistant 文本生成预置音色音频 */
async function synthesizeMimo(context: SpeechRequestContext): Promise<SpeechAudioResult> {
  // MiMo 合成结果
  const response = await postJson(context, {
    model: context.config.model.trim(),
    messages: [{ role: 'assistant', content: context.text }],
    audio: { format: 'wav', voice: context.config.voice.trim() }, stream: false
  }, { 'api-key': context.config.apiKey.trim() })
  // 非流式 Base64 音频字段
  const payload = await response.json() as { choices?: { message?: { audio?: { data?: string } } }[] }
  // 待解码音频
  const encodedAudio = payload.choices?.[0]?.message?.audio?.data
  if (!encodedAudio) throw new Error('MiMo 未返回音频，请检查模型与音色')
  return createAudioResult(Buffer.from(encodedAudio, 'base64'))
}

/** 使用 OpenAI 官方语音接口生成 WAV */
async function synthesizeOpenai(context: SpeechRequestContext): Promise<SpeechAudioResult> {
  return readAudio(await postJson(context, {
    model: context.config.model.trim(), input: context.text, voice: context.config.voice.trim(),
    response_format: 'wav', speed: 1
  }, { Authorization: `Bearer ${context.config.apiKey.trim()}` }))
}

/** 将用户文本安全地放入 SSML 文本与属性 */
function escapeXml(value: string): string {
  // XML 特殊字符转义表
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }
  return value.replace(/[&<>"']/g, (character) => entities[character])
}

/** 使用 Azure Speech 的 SSML 合成接口 */
async function synthesizeAzure(context: SpeechRequestContext): Promise<SpeechAudioResult> {
  // 音色名称中的语言区域
  const language = context.config.voice.trim().split('-').slice(0, 2).join('-')
  return readAudio(await net.fetch(context.config.endpoint.trim(), {
    method: 'POST', signal: context.signal, redirect: 'error',
    headers: {
      'Ocp-Apim-Subscription-Key': context.config.apiKey.trim(),
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'riff-24khz-16bit-mono-pcm'
    },
    body: `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${escapeXml(language)}"><voice name="${escapeXml(context.config.voice.trim())}">${escapeXml(context.text)}</voice></speak>`
  }))
}

/** 使用 ElevenLabs 音色 ID 合成 MP3 */
async function synthesizeElevenlabs(context: SpeechRequestContext): Promise<SpeechAudioResult> {
  // 音色专属请求地址
  const endpoint = `${context.config.endpoint.trim().replace(/\/$/, '')}/${encodeURIComponent(context.config.voice.trim())}?output_format=mp3_44100_128`
  return readAudio(await postJson({ ...context, config: { ...context.config, endpoint } }, {
    text: context.text, model_id: context.config.model.trim(), voice_settings: { speed: 1 }
  }, { 'xi-api-key': context.config.apiKey.trim() }))
}

/** 使用百炼非实时 Qwen-TTS 并获取其输出音频 */
async function synthesizeBailian(context: SpeechRequestContext): Promise<SpeechAudioResult> {
  // 百炼非流式响应
  const response = await postJson(context, {
    model: context.config.model.trim(),
    input: { text: context.text, voice: context.config.voice.trim(), language_type: 'Auto' }
  }, { Authorization: `Bearer ${context.config.apiKey.trim()}` })
  // 服务返回的临时音频 URL
  const payload = await response.json() as { output?: { audio?: { url?: string } } }
  if (!payload.output?.audio?.url) throw new Error('百炼未返回音频地址，请检查模型与音色')
  // 下载音频时不携带服务凭据
  const audioUrl = new URL(payload.output.audio.url)
  if (audioUrl.protocol !== 'https:') throw new Error('百炼返回的音频地址无效')
  return readAudio(await net.fetch(audioUrl.href, { signal: context.signal, redirect: 'error' }))
}

// 服务商与官方协议实现的分发表
const SYNTHESIZERS: Record<SpeechProvider, (context: SpeechRequestContext) => Promise<SpeechAudioResult>> = {
  mimo: synthesizeMimo, openai: synthesizeOpenai, 'azure-speech': synthesizeAzure,
  elevenlabs: synthesizeElevenlabs, 'aliyun-bailian': synthesizeBailian
}
// 每个渲染窗口当前的第三方请求
const activeRequests = new Map<number, AbortController>()

/** 停止指定窗口的第三方生成 */
export function cancelRemoteSpeech(ownerId: number): void {
  activeRequests.get(ownerId)?.abort()
  activeRequests.delete(ownerId)
}

/** 调度第三方语音并统一超时与安全错误反馈 */
export async function synthesizeRemoteSpeech(ownerId: number, request: SpeechSynthesisRequest): Promise<SpeechAudioResult> {
  // 配置错误
  const validationMessage = getSpeechValidationMessage(request.settings)
  if (validationMessage) throw new Error(validationMessage)
  cancelRemoteSpeech(ownerId)
  // 当前请求取消句柄
  const controller = new AbortController()
  activeRequests.set(ownerId, controller)
  // 超时信号覆盖生成与音频下载
  const timeout = AbortSignal.timeout(60_000)
  // 请求与超时共同控制网络生命周期
  const signal = AbortSignal.any([controller.signal, timeout])
  try {
    return await SYNTHESIZERS[request.settings.provider]({
      text: request.text, config: request.settings.providers[request.settings.provider], signal
    })
  } catch {
    if (controller.signal.aborted) throw new Error('语音生成已取消')
    if (timeout.aborted) throw new Error('语音服务请求超时，请稍后重试')
    throw new Error(`${SPEECH_PROVIDERS[request.settings.provider].label} 语音生成失败，请检查网络、服务地址、凭据、额度及模型音色配置`)
  } finally {
    if (activeRequests.get(ownerId) === controller) activeRequests.delete(ownerId)
  }
}
