import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { SentenceAnalysis, TranslateResponse } from '@src/type/base'
import { createTextLearningItemInput } from '@src/utils/learning'
import { speakText, stopSpeaking } from '@src/utils/speak'
import {
  findLearningItem,
  removeLearningItem,
  saveLearningItem
} from '@renderer/services/learning-service'

/** 划词朗读目标 */
type SelectionSpeechTarget = 'source' | 'translation' | null

/** 划词翻译操作参数 */
interface UseSelectionTranslationActionsOptions {
  /* 完整翻译结果 */
  translationResult: TranslateResponse | null
  /* 选中的原文 */
  sourceText: string
  /* 抽屉展示的译文 */
  translatedText: string
  /* 当前句子分析结果 */
  sentenceAnalysis: SentenceAnalysis | null
}

/** 管理划词翻译收藏与朗读流程 */
export default function useSelectionTranslationActions({
  translationResult,
  sourceText,
  translatedText,
  sentenceAnalysis
}: UseSelectionTranslationActionsOptions) {
  // 当前收藏记录 ID
  const [bookmarkedItemId, setBookmarkedItemId] = useState<string | null>(null)
  // 是否正在查询收藏状态
  const [isBookmarkChecking, setIsBookmarkChecking] = useState(false)
  // 是否正在保存收藏状态
  const [isBookmarkSaving, setIsBookmarkSaving] = useState(false)
  // 当前朗读目标
  const [speakingTarget, setSpeakingTarget] = useState<SelectionSpeechTarget>(null)
  // 当前有效的收藏请求编号
  const activeBookmarkRequestId = useRef(0)
  // 当前结果是否已收藏
  const isBookmarked = Boolean(bookmarkedItemId)
  // 收藏状态是否正在变化
  const isBookmarkPending = isBookmarkChecking || isBookmarkSaving
  // 是否正在朗读原文
  const isSpeakingSource = speakingTarget === 'source'
  // 是否正在朗读译文
  const isSpeakingTranslation = speakingTarget === 'translation'

  /** 停止当前划词朗读 */
  function stopSpeech(): void {
    stopSpeaking()
    setSpeakingTarget(null)
  }

  /**
   * 切换指定文本的朗读状态
   * @param target 朗读目标
   * @param text 待朗读文本
   */
  function toggleSpeech(target: Exclude<SelectionSpeechTarget, null>, text: string): void {
    if (speakingTarget === target) {
      stopSpeech()
      return
    }
    if (!text.trim()) {
      return
    }

    setSpeakingTarget(target)
    void speakText(
      text,
      () => setSpeakingTarget(null),
      (error) => {
        setSpeakingTarget(null)
        toast.error(error.message)
      }
    )
  }

  /** 切换当前划词翻译的收藏状态 */
  async function toggleBookmark(): Promise<void> {
    if (!translationResult || !translatedText || isBookmarkPending) {
      return
    }

    // 本次收藏操作编号
    const requestId = activeBookmarkRequestId.current + 1
    activeBookmarkRequestId.current = requestId
    setIsBookmarkSaving(true)

    try {
      if (bookmarkedItemId) {
        await removeLearningItem(bookmarkedItemId)
        if (requestId !== activeBookmarkRequestId.current) {
          return
        }
        setBookmarkedItemId(null)
        toast.success('已取消收藏')
        return
      }

      // 当前划词翻译收藏参数
      const input = createTextLearningItemInput(translationResult, sentenceAnalysis)
      // 保存后的收藏记录
      const savedItem = await saveLearningItem(input)
      if (requestId !== activeBookmarkRequestId.current) {
        return
      }
      setBookmarkedItemId(savedItem.id)
      toast.success('已加入学习收藏')
    } catch (error) {
      if (requestId !== activeBookmarkRequestId.current) {
        return
      }
      // 可展示的收藏错误
      const message = error instanceof Error ? error.message : '收藏数据暂不可用'
      toast.error(message)
    } finally {
      if (requestId === activeBookmarkRequestId.current) {
        setIsBookmarkSaving(false)
      }
    }
  }

  /** 翻译结果变化后同步收藏状态 */
  useEffect(() => {
    activeBookmarkRequestId.current += 1
    // 本次收藏查询编号
    const requestId = activeBookmarkRequestId.current
    setBookmarkedItemId(null)
    setIsBookmarkSaving(false)

    if (!translationResult || !sourceText || !translatedText) {
      setIsBookmarkChecking(false)
      return
    }

    // 当前划词翻译收藏身份
    const identity = createTextLearningItemInput(translationResult, null)
    setIsBookmarkChecking(true)
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
      .finally(() => {
        if (requestId === activeBookmarkRequestId.current) {
          setIsBookmarkChecking(false)
        }
      })
  }, [sourceText, translatedText, translationResult])

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

  /** 组件卸载时停止本地朗读 */
  useEffect(() => {
    return () => stopSpeaking()
  }, [])

  return {
    isBookmarked,
    isBookmarkPending,
    isSpeakingSource,
    isSpeakingTranslation,
    stopSpeech,
    toggleSpeech,
    toggleBookmark
  }
}
