import { useState, useRef, useEffect, useCallback } from 'react'
import { SendEnum } from '@src/type/ipc-constants'
import { toast } from 'sonner'
import { speakText } from '@src/utils/speak'
import { TranslateResponse } from '@src/type/base'
import useLocalForage from '@renderer/hooks/useLocalForage'
import { useNavigate } from 'react-router-dom'
import { TranslationModelProfile } from '@src/type/model'

export default function useData() {
  // 路由跳转方法
  const navigate = useNavigate()
  // 本地配置状态
  const { storeSetting, isInit } = useLocalForage()
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

  /**
   * 跳转到设置页并聚焦模型配置区域
   * @returns {void} 无返回值
   */
  const goToSettingPage = useCallback(() => {
    navigate('/setting?focus=model-config')
  }, [navigate])

  /**
   * 获取当前激活模型
   * @returns {TranslationModelProfile | null} 当前模型
   */
  const getActiveModel = useCallback((): TranslationModelProfile | null => {
    // 当前激活模型
    const currentModel = storeSetting.models.find((item) => item.id === storeSetting.activeModelId)
    return currentModel || null
  }, [storeSetting.activeModelId, storeSetting.models])

  /**
   * 检查当前配置是否可执行翻译
   * @returns {boolean} 是否满足配置条件
   */
  const ensureModelConfigReady = useCallback((): boolean => {
    if (isInit) {
      toast.error('配置加载中，请稍后重试')
      return false
    }
    // 当前模型配置
    const currentModel = getActiveModel()
    if (!currentModel) {
      toast.error('当前模型不存在，请前往设置重新选择', {
        action: {
          label: '去设置',
          onClick: goToSettingPage
        }
      })
      return false
    }
    if (!currentModel.apiKey?.trim()) {
      // 当前模型展示名
      const modelText = currentModel.displayName || currentModel.model || currentModel.id
      toast.error(`模型 ${modelText} 未配置 API Key，请先到设置页完成配置`, {
        action: {
          label: '去设置',
          onClick: goToSettingPage
        }
      })
      return false
    }
    return true
  }, [getActiveModel, goToSettingPage, isInit])

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
    if (!ensureModelConfigReady()) {
      return
    }
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
    if (!ensureModelConfigReady()) {
      return
    }

    if (translateSuccess.current && lastTranslationText.current === translationText.current) {
      toast.error('已翻译')
      return
    }

    lastTranslationText.current = translationText.current.trim()
    setIsLoading(true)
    window.electron.ipcRenderer.send(SendEnum.ENGLISH_CHINESE_TRANSLATION, translationText.current.trim())
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

      console.log(result, 'result');

      setTranslationResult(result)
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
    speakInputText
  }
}
