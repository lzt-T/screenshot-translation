/** 浏览器播放句柄 */
export interface BrowserSpeechPlayback {
  finished: Promise<void>
  cancel: () => void
}

/** 播放浏览器语音，同时允许在音色尚未加载时取消 */
export function playBrowserSpeech(text: string, voiceId: string, onStart?: () => void): BrowserSpeechPlayback {
  // 活跃语句，保持强引用直到播放结束
  let utterance: SpeechSynthesisUtterance | null = null
  // 当前任务的取消入口
  let cancel = (): void => {}
  // 完成与取消共享的任务
  const finished = new Promise<void>((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('当前应用环境不支持浏览器语音，请选择其他来源'))
      return
    }
    // 浏览器语音控制器
    const synthesis = window.speechSynthesis
    // 防止重复终态回调
    let isFinished = false
    // 同时限制音色枚举和系统语音启动等待
    const timer = window.setTimeout(() => {
      finish(new Error(!utterance && voiceId !== 'auto'
        ? '当前音色不可用，请重新选择可用音色'
        : '浏览器语音未能启动，请检查系统音色或选择其他来源'))
      synthesis.cancel()
    }, 5000)

    /** 释放监听与语句并通知完成 */
    function finish(error?: Error): void {
      if (isFinished) return
      isFinished = true
      window.clearTimeout(timer)
      synthesis.removeEventListener('voiceschanged', start)
      if (utterance) { utterance.onend = null; utterance.onerror = null; utterance.onstart = null }
      utterance = null
      if (error) reject(error)
      else resolve()
    }

    /** 在音色就绪后选择匹配项并开始播放 */
    function start(): void {
      if (isFinished || utterance) return
      // 当前可用音色
      const voices = synthesis.getVoices()
      // 自动选择使用的语言前缀
      const language = /[\u3400-\u9fff]/u.test(text) ? 'zh' : 'en'
      // 标准化语言标签，兼容系统返回的大小写与下划线
      const matchingVoices = voices.filter((item) => item.lang.toLowerCase().replace(/_/g, '-').split('-')[0] === language)
      // 已指定音色或自动匹配项
      const voice = voiceId === 'auto'
        ? matchingVoices.find((item) => item.default) ?? matchingVoices[0]
        : voices.find((item) => item.voiceURI === voiceId)
      if (!voice && voiceId !== 'auto') return
      utterance = new SpeechSynthesisUtterance(text)
      if (voice) utterance.voice = voice
      utterance.lang = voice ? voice.lang.replace(/_/g, '-') : language === 'zh' ? 'zh-CN' : 'en-US'
      utterance.rate = 1
      utterance.onstart = () => { if (isFinished) return; window.clearTimeout(timer); onStart?.() }
      utterance.onend = () => finish()
      utterance.onerror = () => finish(new Error('浏览器朗读失败，请检查系统音色或选择其他来源'))
      try { synthesis.speak(utterance) } catch { finish(new Error('浏览器朗读无法启动，请重新选择音色')) }
    }

    cancel = () => { finish(); synthesis.cancel() }
    synthesis.addEventListener('voiceschanged', start)
    start()
  })
  return { finished, cancel: () => cancel() }
}
