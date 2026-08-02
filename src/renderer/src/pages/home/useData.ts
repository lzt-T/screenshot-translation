import { useState, useRef, useEffect, useCallback } from 'react'
import { SendEnum } from '@src/type/ipc-constants'
import { toast } from 'sonner'
import { speakText, stopSpeaking } from '@src/utils/speak'
import {
  Language,
  SentenceAnalysis,
  SentenceAnalysisFailureResponse,
  SentenceAnalysisRequest,
  SentenceAnalysisSuccessResponse,
  TextType,
  TranslateResponse
} from '@src/type/base'
import useLocalForage from '@renderer/hooks/useLocalForage'
import { useNavigate } from 'react-router-dom'
import { TranslationModelProfile } from '@src/type/model'
import { createTextLearningItemInput } from '@src/utils/learning'
import {
  findLearningItem,
  removeLearningItem,
  saveLearningItem
} from '@renderer/services/learning-service'

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
  // 句子分析结果
  const [sentenceAnalysis, setSentenceAnalysis] = useState<SentenceAnalysis | null>(null)
  // 是否正在分析句子
  const [isSentenceAnalysisLoading, setIsSentenceAnalysisLoading] = useState(false)
  // 句子分析错误信息
  const [sentenceAnalysisError, setSentenceAnalysisError] = useState('')
  /** 上一次翻译文本 */
  const lastTranslationText = useRef('')
  /** 翻译是否成功 */
  const translateSuccess = useRef(false)
  /** 当前有效的句子分析请求编号 */
  const activeSentenceAnalysisRequestId = useRef(0)
  /** 翻译结果 */
  const [translationResult, setTranslationResult] = useState<TranslateResponse | null>(null)
  // 已收藏记录 ID
  const [bookmarkedItemId, setBookmarkedItemId] = useState<string | null>(null)
  // 是否正在保存收藏状态
  const [isBookmarkSaving, setIsBookmarkSaving] = useState(false)
  /** 当前收藏查询编号 */
  const activeBookmarkRequestId = useRef(0)
  // 是否正在朗读原文
  const isSpeakingInput = speakingTarget === 'input'
  // 正在朗读的译文条目索引
  const speakingResultIndex = typeof speakingTarget === 'number' ? speakingTarget : null
  // 当前结果是否允许句子分析
  const canAnalyzeSentence =
    translationResult?.sourceLanguage === Language.EN &&
    translationResult.textType === TextType.SENTENCE

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

  /** 清空句子分析并使未完成请求失效 */
  const resetSentenceAnalysis = (): void => {
    activeSentenceAnalysisRequestId.current += 1
    setSentenceAnalysis(null)
    setIsSentenceAnalysisLoading(false)
    setSentenceAnalysisError('')
  }

  /** 处理输入文本变化 */
  const handleInputTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // 最新输入文本
    const nextText = e.target.value
    setTranslationText(nextText)

    if (nextText.trim() !== lastTranslationText.current) {
      setTranslationResult(null)
      setTranslationError('')
      translateSuccess.current = false
      resetSentenceAnalysis()
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
    resetSentenceAnalysis()
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

  /** 发起当前英文句子的结构分析 */
  const onAnalyzeSentence = (): void => {
    if (!canAnalyzeSentence || !translationResult || isSentenceAnalysisLoading) {
      return
    }
    if (!ensureModelConfigReady()) {
      return
    }

    // 首条可用中文译文
    const primaryTranslation =
      translationResult.translation.find((item) => item.zh?.trim())?.zh?.trim() || ''
    if (!primaryTranslation) {
      setSentenceAnalysisError('缺少可供参考的中文译文，请重新翻译后再试')
      return
    }

    // 本次分析请求编号
    const requestId = activeSentenceAnalysisRequestId.current + 1
    // 句子分析请求参数
    const request: SentenceAnalysisRequest = {
      requestId,
      sourceText: translationResult.sourceWords,
      translation: primaryTranslation
    }

    activeSentenceAnalysisRequestId.current = requestId
    setSentenceAnalysis(null)
    setSentenceAnalysisError('')
    setIsSentenceAnalysisLoading(true)
    window.electron.ipcRenderer.send(SendEnum.SENTENCE_ANALYSIS, request)
  }

  /** 切换当前翻译结果的收藏状态 */
  const toggleBookmark = async (): Promise<void> => {
    if (!translationResult || isBookmarkSaving) {
      return
    }

    setIsBookmarkSaving(true)
    try {
      if (bookmarkedItemId) {
        await removeLearningItem(bookmarkedItemId)
        setBookmarkedItemId(null)
        toast.success('已取消收藏')
        return
      }

      // 当前翻译收藏参数
      const input = createTextLearningItemInput(translationResult, sentenceAnalysis)
      // 保存后的收藏记录
      const savedItem = await saveLearningItem(input)
      setBookmarkedItemId(savedItem.id)
      toast.success('已加入学习收藏')
    } catch (error) {
      // 可展示的收藏错误
      const errorMessage = error instanceof Error ? error.message : '收藏数据暂不可用'
      toast.error(errorMessage)
    } finally {
      setIsBookmarkSaving(false)
    }
  }

  /** 当前翻译结果变化后同步收藏状态 */
  useEffect(() => {
    activeBookmarkRequestId.current += 1
    // 本次收藏查询编号
    const requestId = activeBookmarkRequestId.current
    setBookmarkedItemId(null)

    if (!translationResult) {
      return
    }

    // 当前翻译收藏身份
    const identity = createTextLearningItemInput(translationResult, null)
    void findLearningItem(identity)
      .then((item) => {
        if (requestId === activeBookmarkRequestId.current) {
          setBookmarkedItemId(item?.id || null)
        }
      })
      .catch(() => {
        if (requestId === activeBookmarkRequestId.current) {
          setBookmarkedItemId(null)
        }
      })
  }, [translationResult])

  /** 已收藏句子的分析完成后更新收藏快照 */
  useEffect(() => {
    if (!translationResult || !sentenceAnalysis || !bookmarkedItemId) {
      return
    }

    // 包含最新分析的收藏参数
    const input = createTextLearningItemInput(translationResult, sentenceAnalysis)
    void saveLearningItem(input)
      .then((savedItem) => setBookmarkedItemId(savedItem.id))
      .catch(() => toast.error('句子分析已完成，但收藏更新失败'))
  }, [bookmarkedItemId, sentenceAnalysis, translationResult])

  useEffect(() => {
    // 移除可能存在的旧监听器
    window.electron.ipcRenderer.removeAllListeners(SendEnum.ENGLISH_CHINESE_TRANSLATION_SUCCESS)
    window.electron.ipcRenderer.removeAllListeners(SendEnum.ENGLISH_CHINESE_TRANSLATION_FAIL)
    window.electron.ipcRenderer.removeAllListeners(SendEnum.SENTENCE_ANALYSIS_SUCCESS)
    window.electron.ipcRenderer.removeAllListeners(SendEnum.SENTENCE_ANALYSIS_FAIL)

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

    /** 处理句子分析成功响应 */
    const handleSentenceAnalysisSuccess = (
      _event,
      response: SentenceAnalysisSuccessResponse
    ): void => {
      if (response.requestId !== activeSentenceAnalysisRequestId.current) {
        return
      }
      setIsSentenceAnalysisLoading(false)
      setSentenceAnalysisError('')
      setSentenceAnalysis(response.analysis)
    }

    /** 处理句子分析失败响应 */
    const handleSentenceAnalysisFail = (
      _event,
      response: SentenceAnalysisFailureResponse
    ): void => {
      if (response.requestId !== activeSentenceAnalysisRequestId.current) {
        return
      }
      setIsSentenceAnalysisLoading(false)
      setSentenceAnalysisError(response.message || '句子分析失败，请稍后重试')
    }

    // 注册监听器
    window.electron.ipcRenderer.on(SendEnum.ENGLISH_CHINESE_TRANSLATION_SUCCESS, handleSuccess)
    window.electron.ipcRenderer.on(SendEnum.ENGLISH_CHINESE_TRANSLATION_FAIL, handleFail)
    window.electron.ipcRenderer.on(
      SendEnum.SENTENCE_ANALYSIS_SUCCESS,
      handleSentenceAnalysisSuccess
    )
    window.electron.ipcRenderer.on(SendEnum.SENTENCE_ANALYSIS_FAIL, handleSentenceAnalysisFail)


    // 清理函数，组件卸载时移除监听器
    return () => {
      window.electron.ipcRenderer.removeAllListeners(
        SendEnum.ENGLISH_CHINESE_TRANSLATION_SUCCESS
      )
      window.electron.ipcRenderer.removeAllListeners(
        SendEnum.ENGLISH_CHINESE_TRANSLATION_FAIL
      )
      window.electron.ipcRenderer.removeAllListeners(SendEnum.SENTENCE_ANALYSIS_SUCCESS)
      window.electron.ipcRenderer.removeAllListeners(SendEnum.SENTENCE_ANALYSIS_FAIL)
      // 确保离开页面时停止本地语音
      stopSpeaking()
    }
  }, [])

  return {
    isLoading,
    isSpeakingInput,
    speakingResultIndex,
    canAnalyzeSentence,
    isSentenceAnalysisLoading,
    sentenceAnalysis,
    sentenceAnalysisError,
    translationText,
    translationError,
    translationResult,
    bookmarkedItemId,
    isBookmarkSaving,
    handleInputTextChange,
    handleKeyDown,
    onScreenshot,
    onEnglishChineseTranslation,
    onAnalyzeSentence,
    toggleBookmark,
    speakInputText,
    speakResultItem
  }
}
