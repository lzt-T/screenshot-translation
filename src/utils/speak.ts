import type { ElectronAPI } from '@electron-toolkit/preload'
import { SendEnum } from '../type/ipc-constants'
import type { SpeechAudioResult } from '../type/speech'
import localForage from 'localforage'
import type { SpeechSettings, SpeechSource } from '../type/speech-settings'
import { getSpeechValidationMessage, normalizeSpeechSettings } from './speech-settings'
import { playBrowserSpeech } from './browser-speech'

/** 朗读被替代后的续接策略 */
export type SpeechInterruptionPolicy = 'immediate' | 'after-replacement'

/** 处理朗读中断回调的方法 */
type SpeechInterruptionHandler = (callback: () => void) => void

// 当前播放会话编号
let activeSessionId = 0
// 当前音频播放取消方法
let cancelActivePlayback: (() => void) | null = null
// 当前朗读被新任务抢占时的回调
let activeInterruptionCallback: (() => void) | null = null
// 当前朗读的中断续接策略
let activeInterruptionPolicy: SpeechInterruptionPolicy = 'immediate'
// 替代朗读结束后需要执行的续接回调
let pendingContinuationCallback: (() => void) | null = null
// 上一次缓存的完整文本
let cachedText = ''
// 上一次缓存的完整音频
let cachedAudioBuffer: ArrayBuffer | null = null
// 缓存对应的配置快照，仅用于内存比较，不记录凭据
let cachedSettings: SpeechSettings | null = null
// 最近缓存的媒体类型
let cachedMimeType = 'audio/wav'

// 已暴露的 Electron IPC 能力
const electronIpcRenderer = (window as unknown as { electron: ElectronAPI }).electron.ipcRenderer

/** 立即执行被中断朗读的回调 */
function runInterruptionImmediately(callback: () => void): void {
  callback()
}

/** 将被中断朗读的回调延迟到替代朗读结束 */
function deferInterruptionUntilReplacementEnds(callback: () => void): void {
  pendingContinuationCallback = callback
}

// 中断续接策略对应的处理方法
const SPEECH_INTERRUPTION_HANDLER_MAP: Record<
  SpeechInterruptionPolicy,
  SpeechInterruptionHandler
> = {
  immediate: runInterruptionImmediately,
  'after-replacement': deferInterruptionUntilReplacementEnds
}

/** 执行并清除等待中的对话续接回调 */
function completePendingContinuation(): void {
  // 当前等待执行的续接回调
  const continuationCallback = pendingContinuationCallback
  pendingContinuationCallback = null
  continuationCallback?.()
}

/**
 * 播放 WAV 音频
 * @param {ArrayBuffer} audioBuffer WAV 音频数据
 * @returns {Promise<void>} 播放结束任务
 */
function playAudioBuffer(audioBuffer: ArrayBuffer, mimeType: string, onStart?: () => void): Promise<void> {
  // 音频 Blob
  const audioBlob = new Blob([audioBuffer], { type: mimeType })
  // 临时音频地址
  const audioUrl = URL.createObjectURL(audioBlob)
  // 浏览器音频实例
  const audio = new Audio(audioUrl)

  return new Promise((resolve, reject) => {
    // 播放任务是否已经结束
    let isFinished = false

    /**
     * 清理当前音频资源
     * @returns {void} 无返回值
     */
    function cleanup(): void {
      if (isFinished) {
        return
      }
      isFinished = true
      URL.revokeObjectURL(audioUrl)
      if (cancelActivePlayback === cancelPlayback) {
        cancelActivePlayback = null
      }
    }

    /**
     * 取消当前音频播放
     * @returns {void} 无返回值
     */
    function cancelPlayback(): void {
      audio.pause()
      cleanup()
      resolve()
    }

    /**
     * 处理音频自然播放结束
     * @returns {void} 无返回值
     */
    function handleEnded(): void {
      cleanup()
      resolve()
    }

    /**
     * 处理媒体加载失败
     * @returns {void} 无返回值
     */
    function handleMediaError(): void {
      // 浏览器媒体错误信息
      const errorMessage = audio.error?.message
      cleanup()
      reject(new Error(errorMessage ? `语音播放失败：${errorMessage}` : '语音播放失败'))
    }

    /**
     * 处理播放请求被拒绝
     * @param {unknown} error 播放错误
     * @returns {void} 无返回值
     */
    function handlePlayError(error: unknown): void {
      cleanup()
      reject(error instanceof Error ? error : new Error(String(error)))
    }

    cancelActivePlayback = cancelPlayback
    audio.addEventListener('ended', handleEnded, { once: true })
    audio.addEventListener('error', handleMediaError, { once: true })
    audio.addEventListener('playing', () => onStart?.(), { once: true })
    void audio.play().catch(handlePlayError)
  })
}

/**
 * 使用本地模型生成完整语音
 * @param {string} text 待生成的完整文本
 * @returns {Promise<ArrayBuffer>} WAV 音频数据
 */
async function synthesizeSpeech(text: string, settings: SpeechSettings): Promise<SpeechAudioResult> {
  // 完整文本的本地语音生成结果
  const result = (await electronIpcRenderer.invoke(
    SendEnum.SPEECH_SYNTHESIZE,
    { text, settings }
  )) as SpeechAudioResult
  return result
}

/** 播放来源调度上下文 */
interface SpeechPlaybackContext {
  text: string
  settings: SpeechSettings
  sessionId: number
  onStart?: () => void
}

/** 合成或复用与当前配置匹配的音频 */
async function playGeneratedSpeech({ text, settings, sessionId, onStart }: SpeechPlaybackContext): Promise<void> {
  // 仅比较内存快照，不将凭据写入缓存键或日志
  const isCacheMatch = cachedText === text && JSON.stringify(cachedSettings) === JSON.stringify(settings)
  // 当前完整音频
  let audioBuffer = isCacheMatch ? cachedAudioBuffer : null
  if (!audioBuffer) {
    // 当前生成结果
    const result = await synthesizeSpeech(text, settings)
    if (sessionId !== activeSessionId) return
    audioBuffer = result.audioBuffer
    cachedText = text
    cachedSettings = settings
    cachedAudioBuffer = audioBuffer
    cachedMimeType = result.mimeType ?? 'audio/wav'
  }
  await playAudioBuffer(audioBuffer, cachedMimeType, onStart)
}

/** 将浏览器语音纳入现有停止与会话生命周期 */
async function playSystemSpeech({ text, settings, onStart }: SpeechPlaybackContext): Promise<void> {
  // 可在等待音色时取消的播放任务
  const playback = playBrowserSpeech(text, settings.browserVoice, onStart)
  cancelActivePlayback = playback.cancel
  try { await playback.finished } finally {
    if (cancelActivePlayback === playback.cancel) cancelActivePlayback = null
  }
}

// 固定来源对应的播放策略
const SPEECH_PLAYERS: Record<SpeechSource, (context: SpeechPlaybackContext) => Promise<void>> = {
  browser: playSystemSpeech, kokoro: playGeneratedSpeech, 'third-party': playGeneratedSpeech
}

/** 试听可显式指定界面配置并接收实际播放事件 */
export interface SpeechPlaybackOptions {
  settings?: SpeechSettings
  onStart?: () => void
}

/**
 * 取消当前语音生成和播放
 * @param {boolean} shouldNotifyInterruption 是否通知当前朗读已被抢占
 * @param {boolean} shouldContinueInterruptedSpeech 是否完成等待中的对话续接
 * @returns {Promise<number>} 取消完成后的播放会话编号
 */
async function cancelSpeaking(
  shouldNotifyInterruption: boolean,
  shouldContinueInterruptedSpeech: boolean
): Promise<number> {
  activeSessionId += 1
  // 本次取消对应的播放会话编号
  const sessionId = activeSessionId
  // 被取消朗读的抢占回调
  const interruptionCallback = activeInterruptionCallback
  // 被取消朗读的续接策略
  const interruptionPolicy = activeInterruptionPolicy
  activeInterruptionCallback = null
  activeInterruptionPolicy = 'immediate'
  cancelActivePlayback?.()
  cancelActivePlayback = null
  if (shouldNotifyInterruption && interruptionCallback) {
    SPEECH_INTERRUPTION_HANDLER_MAP[interruptionPolicy](interruptionCallback)
  }
  if (!shouldNotifyInterruption) {
    if (shouldContinueInterruptedSpeech) {
      completePendingContinuation()
    } else {
      pendingContinuationCallback = null
    }
  }
  try {
    await electronIpcRenderer.invoke(SendEnum.SPEECH_CANCEL)
  } catch {
    // 主进程已关闭时无需继续等待取消确认
  }
  return sessionId
}

/**
 * 主动停止当前语音生成和播放
 * @param {boolean} shouldContinueInterruptedSpeech 是否完成等待中的对话续接
 * @returns {void} 无返回值
 */
export function stopSpeaking(shouldContinueInterruptedSpeech = false): void {
  void cancelSpeaking(false, shouldContinueInterruptedSpeech)
}

/**
 * 使用所选来源朗读文本，保留统一中断与续接行为
 * @param {string} text 待朗读文本
 * @param {() => void} onEnd 播放结束回调
 * @param {(error: Error) => void} onError 播放失败回调
 * @param {() => void} onInterrupted 被新朗读抢占时的回调
 * @param {SpeechInterruptionPolicy} interruptionPolicy 中断后的续接策略
 * @param {SpeechPlaybackOptions} options 试听配置与实际开始播放回调
 * @returns {Promise<void>} 朗读任务
 */
export async function speakText(
  text: string,
  onEnd?: () => void,
  onError?: (error: Error) => void,
  onInterrupted?: () => void,
  interruptionPolicy: SpeechInterruptionPolicy = 'immediate',
  options?: SpeechPlaybackOptions
): Promise<void> {
  // 当前朗读会话编号
  const sessionId = await cancelSpeaking(true, false)
  if (sessionId !== activeSessionId) {
    return
  }
  // 清理后的朗读文本
  const normalizedText = text.trim()
  if (!normalizedText) {
    onEnd?.()
    completePendingContinuation()
    return
  }
  activeInterruptionCallback = onInterrupted ?? null
  activeInterruptionPolicy = interruptionPolicy

  try {
    // 每次读取已保存配置，试听则固定使用界面传入快照
    const settings = normalizeSpeechSettings(options?.settings ?? await localForage.getItem<SpeechSettings>('speech'))
    if (sessionId !== activeSessionId) return
    // 当前来源的字段校验结果
    const validationMessage = getSpeechValidationMessage(settings)
    if (validationMessage) throw new Error(validationMessage)
    await SPEECH_PLAYERS[settings.source]({
      text: normalizedText, settings, sessionId,
      onStart: () => { if (sessionId === activeSessionId) options?.onStart?.() }
    })
    if (sessionId !== activeSessionId) {
      return
    }

    activeInterruptionCallback = null
    activeInterruptionPolicy = 'immediate'
    onEnd?.()
    completePendingContinuation()
  } catch (error) {
    if (sessionId === activeSessionId) {
      activeInterruptionCallback = null
      activeInterruptionPolicy = 'immediate'
      // 剥离 Electron IPC 包装前缀后的可读错误文本
      const rawMessage = error instanceof Error ? error.message : String(error)
      const cleanedMessage = rawMessage.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, '')
      const speechError = new Error(cleanedMessage)
      onError?.(speechError)
      completePendingContinuation()
    }
  }
}
