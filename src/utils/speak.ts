import type { ElectronAPI } from '@electron-toolkit/preload'
import { SendEnum } from '../type/ipc-constants'
import type { SpeechAudioResult } from '../type/speech'

// 单次生成的最大文本长度
const MAX_SPEECH_SEGMENT_LENGTH = 160
// 当前播放会话编号
let activeSessionId = 0
// 当前音频播放取消方法
let cancelActivePlayback: (() => void) | null = null
// 上一次缓存的完整文本
let cachedText = ''
// 上一次缓存的分段音频
let cachedAudioBuffers: ArrayBuffer[] = []

// 已暴露的 Electron IPC 能力
const electronIpcRenderer = (window as unknown as { electron: ElectronAPI }).electron.ipcRenderer

/**
 * 将朗读文本按标点和长度拆分
 * @param {string} text 待朗读文本
 * @returns {string[]} 文本分段
 */
function splitSpeechText(text: string): string[] {
  // 按句末标点切分的原始分段
  const rawSegments = text.match(/[^。！？!?；;\n]+[。！？!?；;]?/gu) || [text]
  // 长度受限的最终分段
  const segments: string[] = []

  rawSegments.forEach((rawSegment) => {
    // 清理空白后的分段
    const normalizedSegment = rawSegment.trim()
    if (!normalizedSegment) {
      return
    }

    // 当前分段截取偏移
    for (let offset = 0; offset < normalizedSegment.length; offset += MAX_SPEECH_SEGMENT_LENGTH) {
      segments.push(normalizedSegment.slice(offset, offset + MAX_SPEECH_SEGMENT_LENGTH))
    }
  })

  return segments
}

/**
 * 播放单段 WAV 音频
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
    // 当前朗读音频缓存
    const audioBuffers: ArrayBuffer[] = cachedText === normalizedText ? cachedAudioBuffers : []

    if (audioBuffers.length === 0) {
      // 当前朗读文本分段
      const textSegments = splitSpeechText(normalizedText)
      // 逐段生成并播放文本
      for (const textSegment of textSegments) {
        // 单段本地语音生成结果
        const result = (await electronIpcRenderer.invoke(
          SendEnum.SPEECH_SYNTHESIZE,
          textSegment
        )) as SpeechAudioResult
        if (sessionId !== activeSessionId) {
          return
        }

        audioBuffers.push(result.audioBuffer)
        await playAudioBuffer(result.audioBuffer)
        if (sessionId !== activeSessionId) {
          return
        }
      }

      cachedText = normalizedText
      cachedAudioBuffers = audioBuffers
    } else {
      // 顺序播放缓存音频
      for (const audioBuffer of audioBuffers) {
        await playAudioBuffer(audioBuffer)
        if (sessionId !== activeSessionId) {
          return
        }
      }
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
