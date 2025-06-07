export const speakText = (text: string, onEnd?: () => void, onError?: () => void) => {
  try {
    if (!text) {
      return
    }
    const utterance = new SpeechSynthesisUtterance(text)
    // 根据文本内容自动判断语言
    const isEnglish = /^[a-zA-Z0-9\s\p{P}]*$/u.test(text.trim())
    utterance.lang = isEnglish ? 'en-US' : 'zh-CN'
    utterance.onend = onEnd || (() => {})
    utterance.onerror = onError || (() => {})
    window.speechSynthesis.speak(utterance)
  } catch (error) {
    throw error
  }
}