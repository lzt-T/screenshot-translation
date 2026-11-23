import { useState, useRef, useEffect, useCallback } from 'react'
import localForage from 'localforage'
import { SendEnum } from '@src/type/ipc-constants'
import { toast } from 'sonner'
import { speakText, stopSpeaking } from '@src/utils/speak'
import { Language, TextType, TranslateResponse } from '@src/type/base'
import useLocalForage from '@renderer/hooks/useLocalForage'
import useSentenceAnalysis from '@renderer/hooks/useSentenceAnalysis'
import { useNavigate } from 'react-router-dom'
import { TranslationModelProfile } from '@src/type/model'
import {
  canAnalyzeSentenceLearning,
  createTextLearningItemInput,
  getPrimaryAnalysisTranslation
} from '@src/utils/learning'
import {
  findLearningItem,
  removeLearningItem,
  saveLearningItem
} from '@renderer/services/learning-service'

/** 当前朗读目标，数字表示译文条目索引 */
type SpeakingTarget = 'input' | number | null

/** 本地持久化最近翻译记录的键名与上限 */
const RECENT_TRANSLATIONS_STORAGE_KEY = 'bai-ze-recent-translations'
const MAX_RECENT_TRANSLATION_COUNT = 5

/** 最近翻译历史条目 */
export interface RecentTranslationItem {
  id: string
  sourceText: string
  previewText: string
  result: TranslateResponse
  updatedAt: number
}

/** 提取用于最近历史列表展示的简短译文摘要 */
function extractPreviewText(result: TranslateResponse): string {
  if (result.textType === TextType.WORD) {
    const meaning = result.exampleSentences?.find((item) => item.wordTranslation)?.wordTranslation
    if (meaning) {
      return meaning
    }
  }
  const firstItem = result.translation?.[0]
  if (!firstItem) {
    return ''
  }
  if (result.sourceLanguage === Language.ZH) {
    return firstItem.en || firstItem.zh || ''
  }
  return firstItem.zh || firstItem.en || ''
}

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
  // 当前结果是否允许句子学习分析
  const canAnalyzeSentence = canAnalyzeSentenceLearning(translationResult)
  // 句子分析状态和操作
  const {
    sentenceAnalysis,
    isSentenceAnalysisLoading,
    sentenceAnalysisError,
    analyzeSentence,
    resetSentenceAnalysis
  } = useSentenceAnalysis()
  // 最近翻译历史记录
  const [recentItems, setRecentItems] = useState<RecentTranslationItem[]>([])

  /**
   * 跳转到设置页并聚焦模型配置区域
   * @returns {void} 无返回值
   */
  const goToSettingPage = useCallback(() => {
    navigate('/setting?tab=model&focus=model-config')
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

  /** 清空原文与当前译文状态 */
  const clearInputText = () => {
    stopSpeaking()
    setSpeakingTarget(null)
    setTranslationText('')
    setTranslationResult(null)
    setTranslationError('')
    lastTranslationText.current = ''
    translateSuccess.current = false
    resetSentenceAnalysis()
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
  const onEnglishChineseTranslation = (overrideText?: string) => {
    if (isLoading) {
      return
    }
    // 本次待翻译文本
    const targetText = (overrideText ?? translationText).trim()
    if (targetText === '') {
      toast.error('请输入要翻译的文本')
      return
    }
    if (!ensureModelConfigReady()) {
      return
    }

    lastTranslationText.current = targetText
    stopSpeaking()
    setSpeakingTarget(null)
    setTranslationResult(null)
    setTranslationError('')
    resetSentenceAnalysis()
    setIsLoading(true)
    window.electron.ipcRenderer.send(SendEnum.ENGLISH_CHINESE_TRANSLATION, targetText)
  }

  /**
   * 填入推荐例句并立即执行翻译
   * @param sample 示例英文句子
   * @returns {void} 无返回值
   */
  const translateSampleText = (sample: string): void => {
    if (isLoading) {
      return
    }
    setTranslationText(sample)
    onEnglishChineseTranslation(sample)
  }

  /**
   * 读取剪贴板文本并直接发起翻译
   * @returns {Promise<void>} 异步读取任务
   */
  const pasteAndTranslate = async (): Promise<void> => {
    if (isLoading) {
      return
    }
    try {
      const clipboardText = (await navigator.clipboard.readText()).trim()
      if (!clipboardText) {
        toast.info('剪贴板暂无可翻译文本')
        return
      }
      setTranslationText(clipboardText)
      onEnglishChineseTranslation(clipboardText)
    } catch {
      toast.info('无法读取剪贴板，请直接在左侧粘贴')
    }
  }

  /**
   * 回看最近翻译条目，直接恢复原文与结果
   * @param item 历史翻译记录
   * @returns {void} 无返回值
   */
  const selectRecentItem = (item: RecentTranslationItem): void => {
    stopSpeaking()
    setSpeakingTarget(null)
    resetSentenceAnalysis()
    setTranslationError('')
    setTranslationText(item.sourceText)
    lastTranslationText.current = item.sourceText
    translateSuccess.current = true
    setTranslationResult(item.result)
  }

  /** 清空最近翻译记录 */
  const clearRecentHistory = (): void => {
    setRecentItems([])
    void localForage.removeItem(RECENT_TRANSLATIONS_STORAGE_KEY).catch(() => undefined)
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

  /** 发起当前句子的学习分析 */
  const onAnalyzeSentence = (): void => {
    if (!canAnalyzeSentence || !translationResult || isSentenceAnalysisLoading) {
      return
    }
    if (!ensureModelConfigReady()) {
      return
    }

    // 首条可用主译文
    const primaryTranslation = getPrimaryAnalysisTranslation(translationResult)
    void analyzeSentence(
      translationResult.sourceLanguage,
      translationResult.sourceWords,
      primaryTranslation
    )
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

  /** 首次挂载时读取最近翻译历史 */
  useEffect(() => {
    let isCancelled = false
    void localForage
      .getItem<RecentTranslationItem[]>(RECENT_TRANSLATIONS_STORAGE_KEY)
      .then((stored) => {
        if (!isCancelled && Array.isArray(stored)) {
          setRecentItems(stored)
        }
      })
      .catch(() => undefined)
    return () => {
      isCancelled = true
    }
  }, [])

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

      const sourceText = (result.sourceWords || lastTranslationText.current).trim()
      if (sourceText) {
        const nextItem: RecentTranslationItem = {
          id: `${Date.now()}`,
          sourceText,
          previewText: extractPreviewText(result),
          result,
          updatedAt: Date.now()
        }
        setRecentItems((previous) => {
          const deduped = previous.filter((item) => item.sourceText !== sourceText)
          const nextList = [nextItem, ...deduped].slice(0, MAX_RECENT_TRANSLATION_COUNT)
          void localForage.setItem(RECENT_TRANSLATIONS_STORAGE_KEY, nextList).catch(() => undefined)
          return nextList
        })
      }

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
      resetSentenceAnalysis()
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
    recentItems,
    clearInputText,
    handleInputTextChange,
    handleKeyDown,
    onScreenshot,
    onEnglishChineseTranslation,
    translateSampleText,
    pasteAndTranslate,
    selectRecentItem,
    clearRecentHistory,
    onAnalyzeSentence,
    toggleBookmark,
    speakInputText,
    speakResultItem
  }
}
