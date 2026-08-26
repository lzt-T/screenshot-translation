import type { ElectronAPI } from '@electron-toolkit/preload'
import { SendEnum } from '../type/ipc-constants'
import type { SpeechAudioResult } from '../type/speech'

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
function playAudioBuffer(audioBuffer: ArrayBuffer): Promise<void> {
  // 音频 Blob
  const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' })
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
      reject(new Error(errorMessage ? `本地语音播放失败：${errorMessage}` : '本地语音播放失败'))
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
    void audio.play().catch(handlePlayError)
  })
}

/**
 * 使用本地模型生成完整语音
 * @param {string} text 待生成的完整文本
 * @returns {Promise<ArrayBuffer>} WAV 音频数据
 */
async function synthesizeSpeech(text: string): Promise<ArrayBuffer> {
  // 完整文本的本地语音生成结果
  const result = (await electronIpcRenderer.invoke(
    SendEnum.SPEECH_SYNTHESIZE,
    text
  )) as SpeechAudioResult
  return result.audioBuffer
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
 * 使用本地模型朗读文本
 * @param {string} text 待朗读文本
 * @param {() => void} onEnd 播放结束回调
 * @param {(error: Error) => void} onError 播放失败回调
 * @param {() => void} onInterrupted 被新朗读抢占时的回调
 * @param {SpeechInterruptionPolicy} interruptionPolicy 中断后的续接策略
 * @returns {Promise<void>} 朗读任务
 */
export async function speakText(
  text: string,
  onEnd?: () => void,
  onError?: (error: Error) => void,
  onInterrupted?: () => void,
  interruptionPolicy: SpeechInterruptionPolicy = 'immediate'
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
    // 当前完整朗读音频
    let audioBuffer = cachedText === normalizedText ? cachedAudioBuffer : null
    if (!audioBuffer) {
      audioBuffer = await synthesizeSpeech(normalizedText)
      if (sessionId !== activeSessionId) {
        return
      }

      cachedText = normalizedText
      cachedAudioBuffer = audioBuffer
    }

    await playAudioBuffer(audioBuffer)
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
      // 可供界面展示的语音错误
      const speechError = error instanceof Error ? error : new Error(String(error))
      onError?.(speechError)
      completePendingContinuation()
    }
  }
}
