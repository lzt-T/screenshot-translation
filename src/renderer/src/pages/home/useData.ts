import { useState, useRef, useEffect, useCallback } from 'react'
import { SendEnum } from '@src/type/ipc-constants'
import { toast } from 'sonner'
import { speakText } from '@src/utils/speak'
import { parseJson } from '@src/utils/ai'
import { TranslateResponse } from '@src/type/base'
import { getLanguageType } from '@src/utils/ai'

export default function useData() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  /** 翻译文本 */
  const translationText = useRef('')
  /** 上一次翻译文本 */
  const lastTranslationText = useRef('')
  /** 翻译是否成功 */
  const translateSuccess = useRef(false)
  /** 翻译结果 */
  const [translationResult, setTranslationResult] = useState<TranslateResponse | null>(null)

  /** 处理输入文本变化 */
  const handleInputTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    translationText.current = e.target.value

    if (e.target.value.trim() === '') {
      setTranslationResult(null)
      translateSuccess.current = false
    }
  }

  /** 处理键盘事件 */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onEnglishChineseTranslation()
    }
  }

  /** 开始截图 */
  const onScreenshot = () => {
    window.electron.ipcRenderer.send(SendEnum.SCREENSHOT_START)
  }

  /** 英汉互译 */
  const onEnglishChineseTranslation = () => {
    if (isLoading) {
      toast.error('正在翻译中...')
      return
    }
    if (translationText.current.trim() === '') {
      toast.error('请输入要翻译的文本')
      return
    }

    if (translateSuccess.current && lastTranslationText.current === translationText.current) {
      toast.error('已翻译')
      return
    }

    lastTranslationText.current = translationText.current
    setIsLoading(true)
    window.electron.ipcRenderer.send(SendEnum.ENGLISH_CHINESE_TRANSLATION, translationText.current)
  }

  /** 朗读输入文本 */
  const speakInputText = () => {
    if (!translationText.current || isSpeaking) {
      return
    }
    setIsSpeaking(true)
    speakText(
      translationText.current,
      () => {
        setIsSpeaking(false)
      },
      () => {
        setIsSpeaking(false)
      }
    )
  }

  useEffect(() => {
    // 移除可能存在的旧监听器
    window.electron.ipcRenderer.removeAllListeners(SendEnum.ENGLISH_CHINESE_TRANSLATION_SUCCESS)
    window.electron.ipcRenderer.removeAllListeners(SendEnum.ENGLISH_CHINESE_TRANSLATION_FAIL)

    // 成功处理函数
    const handleSuccess = (event, result) => {
      setIsLoading(false)

      setTranslationResult(() => {
        let resultData: TranslateResponse | null = null
        resultData = parseJson(result) as unknown as TranslateResponse
        // 解析失败
        if (resultData === null) {
          return result.replace(/"/g, '')
        }
        const languageType = getLanguageType(translationText.current)

        console.log(languageType, 'languageType');


        resultData.sourceLanguage = languageType

        return resultData
      })
      translateSuccess.current = true
      toast.success('翻译成功', {
        id: 'translation-success'
      })
    }

    // 失败处理函数
    const handleFail = (event, result) => {
      setIsLoading(false)
      toast.error(result, {
        id: 'translation-fail'
      })
      translateSuccess.current = false
    }

    // 注册监听器
    window.electron.ipcRenderer.on(SendEnum.ENGLISH_CHINESE_TRANSLATION_SUCCESS, handleSuccess)
    window.electron.ipcRenderer.on(SendEnum.ENGLISH_CHINESE_TRANSLATION_FAIL, handleFail)


    // 清理函数，组件卸载时移除监听器
    return () => {
      window.electron.ipcRenderer.removeAllListeners(
        SendEnum.ENGLISH_CHINESE_TRANSLATION_SUCCESS
      )
      window.electron.ipcRenderer.removeAllListeners(
        SendEnum.ENGLISH_CHINESE_TRANSLATION_FAIL
      )
      // 确保离开页面时停止所有语音
      window.speechSynthesis.cancel()
    }
  }, [])

  return {
    isLoading,
    isSpeaking,
    translationText,
    translationResult,
    handleInputTextChange,
    handleKeyDown,
    onScreenshot,
    onEnglishChineseTranslation,
    speakInputText,
  }
}

