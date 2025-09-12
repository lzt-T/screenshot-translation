import { useState, useRef, useEffect, useCallback } from 'react'
import { SendEnum } from '@src/type/ipc-constants'
import { toast } from 'sonner'
import { speakText } from '@src/utils/speak'
import { parseJson } from '@src/utils/ai'

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
  const [translationResult, setTranslationResult] = useState('')

  /** 处理输入文本变化 */
  const handleInputTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    translationText.current = e.target.value

    if (e.target.value.trim() === '') {
      setTranslationResult('')
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

  /** 交换输入文本和翻译结果 */
  const swapContent = useCallback(() => {
    if (!translationResult) {
      toast.error('没有可交换的内容')
      return
    }

    // 保存当前翻译结果
    const currentResult = translationResult

    // 将当前输入设置为翻译结果
    setTranslationResult(translationText.current)

    // 将当前翻译结果设置为输入文本
    translationText.current = currentResult

    // 更新输入框的值
    const textareaElement = document.querySelector('textarea') as HTMLTextAreaElement
    if (textareaElement) {
      textareaElement.value = currentResult
    }

    toast.success('内容已互换')
  }, [translationResult, translationText])

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

  /** 朗读翻译结果 */
  const speakTranslationResult = () => {
    if (!translationResult || isSpeaking) {
      return
    }
    setIsSpeaking(true)
    speakText(
      translationResult,
      () => {
        setIsSpeaking(false)
      },
      () => {
        setIsSpeaking(false)
      }
    )
  }

  useEffect(() => {
    window.electron.ipcRenderer.removeAllListeners(SendEnum.SWAP_CONTENT)
    window.electron.ipcRenderer.on(SendEnum.SWAP_CONTENT, swapContent)
    return () => {
      window.electron.ipcRenderer.removeAllListeners(SendEnum.SWAP_CONTENT)
    }
  }, [swapContent])

  useEffect(() => {
    // 移除可能存在的旧监听器
    window.electron.ipcRenderer.removeAllListeners(SendEnum.ENGLISH_CHINESE_TRANSLATION_SUCCESS)
    window.electron.ipcRenderer.removeAllListeners(SendEnum.ENGLISH_CHINESE_TRANSLATION_FAIL)

    // 成功处理函数
    const handleSuccess = (event, result) => {
      setIsLoading(false)
      setTranslationResult(() => {
        let resultData = ''
        const keyConfig = {
          'zh': '简体中文',
          'en': '英语',
        }
        let data = parseJson(result)
        // 解析失败
        if (data === null) {
          return result.replace(/"/g, '')
        }
        let keys = Object.keys(data)
        keys.length > 1 && keys.forEach(key => {
          if (!!data[key] && data[key] !== 'null') {
            resultData += `${keyConfig[key] || key} : ${data[key]}\n`
          }
        })

        if (keys.length === 1) {
          // 当翻译为中文或者英文时，直接返回翻译结果
          if (Object.keys(keyConfig).includes(keys[0])) {
            resultData = `${data[keys[0]]}`
          } else {
            // 词性只存在一个
            resultData = `${keys[0]} : ${data[keys[0]]}`
          }
        }
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
    swapContent,
    speakInputText,
    speakTranslationResult
  }
}

