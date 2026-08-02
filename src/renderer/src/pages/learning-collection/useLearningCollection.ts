import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { LearningItem, LearningItemKind } from '@src/type/learning'
import { copyText } from '@src/utils/copy'
import { speakText, stopSpeaking } from '@src/utils/speak'
import { listLearningItems, removeLearningItem } from '@renderer/services/learning-service'

/** 收藏类型筛选 */
export type LearningKindFilter = 'all' | LearningItemKind

/** 管理学习收藏页的查询与交互流程 */
export default function useLearningCollection() {
  // 当前收藏列表
  const [items, setItems] = useState<LearningItem[]>([])
  // 全部收藏数量
  const [total, setTotal] = useState(0)
  // 搜索关键词
  const [query, setQuery] = useState('')
  // 内容类型筛选
  const [kindFilter, setKindFilter] = useState<LearningKindFilter>('all')
  // 展开的收藏记录 ID
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)
  // 正在朗读的收藏记录 ID
  const [speakingItemId, setSpeakingItemId] = useState<string | null>(null)
  // 正在删除的收藏记录 ID
  const [removingItemId, setRemovingItemId] = useState<string | null>(null)
  // 是否正在读取收藏
  const [isLoading, setIsLoading] = useState(true)
  // 收藏读取错误信息
  const [errorMessage, setErrorMessage] = useState('')
  /** 当前列表查询编号 */
  const activeQueryRequestId = useRef(0)

  /** 读取当前筛选条件下的学习收藏 */
  const loadItems = useCallback(async (): Promise<void> => {
    activeQueryRequestId.current += 1
    // 本次列表查询编号
    const requestId = activeQueryRequestId.current
    setIsLoading(true)
    setErrorMessage('')

    try {
      // 当前列表查询结果
      const result = await listLearningItems({
        query,
        kind: kindFilter === 'all' ? undefined : kindFilter
      })
      if (requestId !== activeQueryRequestId.current) {
        return
      }
      setItems(result.items)
      setTotal(result.total)
    } catch (error) {
      if (requestId !== activeQueryRequestId.current) {
        return
      }
      // 可展示的读取错误
      const message = error instanceof Error ? error.message : '收藏数据暂不可用'
      setItems([])
      setErrorMessage(message)
    } finally {
      if (requestId === activeQueryRequestId.current) {
        setIsLoading(false)
      }
    }
  }, [kindFilter, query])

  /** 切换收藏详情展开状态 */
  function toggleExpandedItem(itemId: string): void {
    setExpandedItemId((currentId) => (currentId === itemId ? null : itemId))
  }

  /** 复制收藏原文与译文 */
  function copyLearningItem(item: LearningItem): void {
    copyText(`${item.originalText}\n${item.translatedText}`)
  }

  /** 切换收藏译文朗读状态 */
  function toggleLearningItemSpeech(item: LearningItem): void {
    if (speakingItemId === item.id) {
      stopSpeaking()
      setSpeakingItemId(null)
      return
    }

    setSpeakingItemId(item.id)
    void speakText(
      item.originalText,
      () => setSpeakingItemId(null),
      (error) => {
        setSpeakingItemId(null)
        toast.error(error.message)
      }
    )
  }

  /** 取消指定学习收藏 */
  async function removeItem(itemId: string): Promise<void> {
    if (removingItemId) {
      return
    }

    setRemovingItemId(itemId)
    try {
      await removeLearningItem(itemId)
      if (speakingItemId === itemId) {
        stopSpeaking()
        setSpeakingItemId(null)
      }
      if (expandedItemId === itemId) {
        setExpandedItemId(null)
      }
      toast.success('已取消收藏')
      await loadItems()
    } catch (error) {
      // 可展示的删除错误
      const message = error instanceof Error ? error.message : '取消收藏失败'
      toast.error(message)
    } finally {
      setRemovingItemId(null)
    }
  }

  /** 筛选变化与窗口重新聚焦时刷新收藏 */
  useEffect(() => {
    void loadItems()

    /** 窗口重新聚焦后刷新截图浮层写入的数据 */
    function handleWindowFocus(): void {
      void loadItems()
    }

    window.addEventListener('focus', handleWindowFocus)
    return () => window.removeEventListener('focus', handleWindowFocus)
  }, [loadItems])

  /** 页面卸载时停止本地朗读 */
  useEffect(() => {
    return () => stopSpeaking()
  }, [])

  return {
    items,
    total,
    query,
    kindFilter,
    expandedItemId,
    speakingItemId,
    removingItemId,
    isLoading,
    errorMessage,
    setQuery,
    setKindFilter,
    loadItems,
    toggleExpandedItem,
    copyLearningItem,
    toggleLearningItemSpeech,
    removeItem
  }
}
