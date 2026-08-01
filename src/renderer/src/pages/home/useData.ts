import { useState, useRef, useEffect, useCallback } from 'react'
import { SendEnum } from '@src/type/ipc-constants'
import { toast } from 'sonner'
import { speakText, stopSpeaking } from '@src/utils/speak'
import { TranslateResponse } from '@src/type/base'
import useLocalForage from '@renderer/hooks/useLocalForage'
import { useNavigate } from 'react-router-dom'
import { TranslationModelProfile } from '@src/type/model'

/** 当前朗读目标，数字表示译文条目索引 */
type SpeakingTarget = 'input' | number | null

/**
 * 首页翻译数据 Hook
 * @returns 首页翻译状态与交互方法
 */
export default function useData() {
  // 路由跳转方法
  const navigate = useNavigate()
  // 本地配置状态
  const { storeSetting, isInit } = useLocalForage()
  // 是否正在翻译
  const [isLoading, setIsLoading] = useState(false)
  // 当前朗读目标
  const [speakingTarget, setSpeakingTarget] = useState<SpeakingTarget>(null)
  // 翻译文本
  const [translationText, setTranslationText] = useState('')
  // 翻译错误信息
  const [translationError, setTranslationError] = useState('')
  /** 上一次翻译文本 */
  const lastTranslationText = useRef('')
  /** 翻译是否成功 */
  const translateSuccess = useRef(false)
  /** 翻译结果 */
  const [translationResult, setTranslationResult] = useState<TranslateResponse | null>(null)
  // 是否正在朗读原文
  const isSpeakingInput = speakingTarget === 'input'
  // 正在朗读的译文条目索引
  const speakingResultIndex = typeof speakingTarget === 'number' ? speakingTarget : null

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
    if (!currentModel.isBuiltInFree && !currentModel.apiKey?.trim()) {
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
    // 最新输入文本
    const nextText = e.target.value
    setTranslationText(nextText)

    if (nextText.trim() !== lastTranslationText.current) {
      setTranslationResult(null)
      setTranslationError('')
      translateSuccess.current = false
    }
  }

  /** 处理键盘事件 */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
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
    if (translationText.trim() === '') {
      toast.error('请输入要翻译的文本')
      return
    }
    if (!ensureModelConfigReady()) {
      return
    }

    if (translateSuccess.current && lastTranslationText.current === translationText) {
      toast.error('已翻译')
      return
    }

    // 清理后的待翻译文本
    const normalizedText = translationText.trim()
    lastTranslationText.current = normalizedText
    stopSpeaking()
    setSpeakingTarget(null)
    setTranslationResult(null)
    setTranslationError('')
    setIsLoading(true)
    window.electron.ipcRenderer.send(SendEnum.ENGLISH_CHINESE_TRANSLATION, normalizedText)
  }

  /**
   * 切换指定文本的朗读状态
   * @param target 朗读目标或译文条目索引
   * @param text 朗读文本
   * @returns {void} 无返回值
   */
  function toggleSpeech(target: Exclude<SpeakingTarget, null>, text: string): void {
    if (speakingTarget === target) {
      stopSpeaking()
      setSpeakingTarget(null)
      return
    }
    if (!text.trim()) {
      return
    }
    setSpeakingTarget(target)
    void speakText(
      text,
      () => {
        setSpeakingTarget(null)
      },
      (error) => {
        setSpeakingTarget(null)
        toast.error(error.message)
      }
    )
  }

  /** 朗读输入文本 */
  const speakInputText = () => {
    toggleSpeech('input', translationText)
  }

  /**
   * 朗读指定译文条目
   * @param index 译文条目索引
   * @param text 译文条目文本
   * @returns {void} 无返回值
   */
  const speakResultItem = (index: number, text: string): void => {
    toggleSpeech(index, text)
  }

  useEffect(() => {
    // 移除可能存在的旧监听器
    window.electron.ipcRenderer.removeAllListeners(SendEnum.ENGLISH_CHINESE_TRANSLATION_SUCCESS)
    window.electron.ipcRenderer.removeAllListeners(SendEnum.ENGLISH_CHINESE_TRANSLATION_FAIL)

    // 成功处理函数
    const handleSuccess = (_event, result: TranslateResponse) => {
      setIsLoading(false)
      setTranslationError('')
      setTranslationResult(result)
      translateSuccess.current = true
      toast.success('翻译成功', {
        id: 'translation-success'
      })
    }

    // 失败处理函数
    const handleFail = (_event, result: string) => {
      // 可持续展示的失败信息
      const errorMessage = result || '翻译失败，请稍后重试'
      setIsLoading(false)
      setTranslationError(errorMessage)
      toast.error(errorMessage, {
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
      // 确保离开页面时停止本地语音
      stopSpeaking()
    }
  }, [])

  return {
    isLoading,
    isSpeakingInput,
    speakingResultIndex,
    translationText,
    translationError,
    translationResult,
    handleInputTextChange,
    handleKeyDown,
    onScreenshot,
    onEnglishChineseTranslation,
    speakInputText,
    speakResultItem
  }
}
