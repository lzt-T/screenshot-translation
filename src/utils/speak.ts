import type { ElectronAPI } from '@electron-toolkit/preload'
import { SendEnum } from '../type/ipc-constants'
import type { SpeechAudioResult } from '../type/speech'

// 当前播放会话编号
let activeSessionId = 0
// 当前音频播放取消方法
let cancelActivePlayback: (() => void) | null = null
// 上一次缓存的完整文本
let cachedText = ''
// 上一次缓存的完整音频
let cachedAudioBuffer: ArrayBuffer | null = null

// 已暴露的 Electron IPC 能力
const electronIpcRenderer = (window as unknown as { electron: ElectronAPI }).electron.ipcRenderer

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
 * 停止当前语音生成和播放
 * @returns {void} 无返回值
 */
export function stopSpeaking(): void {
  activeSessionId += 1
  cancelActivePlayback?.()
  cancelActivePlayback = null
  electronIpcRenderer.send(SendEnum.SPEECH_CANCEL)
}

/**
 * 使用本地模型朗读文本
 * @param {string} text 待朗读文本
 * @param {() => void} onEnd 播放结束回调
 * @param {(error: Error) => void} onError 播放失败回调
 * @returns {Promise<void>} 朗读任务
 */
export async function speakText(
  text: string,
  onEnd?: () => void,
  onError?: (error: Error) => void
): Promise<void> {
  stopSpeaking()
  // 当前朗读会话编号
  const sessionId = activeSessionId
  // 清理后的朗读文本
  const normalizedText = text.trim()
  if (!normalizedText) {
    onEnd?.()
    return
  }

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

    onEnd?.()
  } catch (error) {
    if (sessionId === activeSessionId) {
      // 可供界面展示的语音错误
      const speechError = error instanceof Error ? error : new Error(String(error))
      onError?.(speechError)
    }
  }
}
