import { useEffect, useRef, useState } from 'react'
import type { SpeechSettings } from '@src/type/speech-settings'
import { speakText, stopSpeaking } from '@src/utils/speak'

// 三种来源共用的英文试听文本
export const SPEECH_PREVIEW_TEXT = 'Hello! Learning English becomes easier when you practice a little every day.'

/** 管理当前设置区域的试听与浏览器音色列表 */
export function useSpeechPreview(settings: SpeechSettings) {
  // 可用浏览器音色
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  // 试听状态
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing'>('idle')
  // 试听错误
  const [error, setError] = useState('')
  // 防止旧试听回调更新状态
  const generation = useRef(0)
  // 仅停止本区域仍持有的试听
  const isPreviewActive = useRef(false)

  /** 停止本区域试听，不影响随后由其他页面接管的朗读 */
  function stopPreview(): void {
    generation.current += 1
    if (isPreviewActive.current) stopSpeaking()
    isPreviewActive.current = false
    setStatus('idle')
  }

  /** 用界面当前配置试听，保存延迟不会导致使用旧音色 */
  function preview(): void {
    stopPreview()
    // 当前试听编号
    const requestId = ++generation.current
    isPreviewActive.current = true
    setError('')
    setStatus('loading')

    /** 当前试听完成或被其他朗读替代 */
    function finish(): void {
      if (generation.current !== requestId) return
      isPreviewActive.current = false
      setStatus('idle')
    }

    void speakText(SPEECH_PREVIEW_TEXT, finish, (failure) => {
      if (generation.current !== requestId) return
      finish()
      setError(failure.message)
    }, finish, 'immediate', {
      settings,
      onStart: () => { if (generation.current === requestId) setStatus('playing') }
    })
  }

  /** 异步音色加载后更新选项，并清理监听 */
  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    /** 同步当前音色清单 */
    function updateVoices(): void { setVoices(window.speechSynthesis.getVoices()) }
    updateVoices()
    window.speechSynthesis.addEventListener('voiceschanged', updateVoices)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', updateVoices)
  }, [])

  /** 切换来源、服务商、模型、音色或离开设置时清除旧试听及错误 */
  useEffect(() => {
    setError('')
    setStatus('idle')
    return () => {
      generation.current += 1
      if (isPreviewActive.current) stopSpeaking()
      isPreviewActive.current = false
    }
  }, [settings.source, settings.provider, settings.browserVoice, settings.kokoroVoice, settings.providers[settings.provider].model, settings.providers[settings.provider].voice])

  return { voices, status, error, preview, stopPreview }
}
