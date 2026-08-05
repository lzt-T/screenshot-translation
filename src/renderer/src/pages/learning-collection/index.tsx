import React from 'react'
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Copy,
  Loader2,
  Search,
  Trash2,
  Volume2,
  VolumeX
} from 'lucide-react'
import type { LearningItem, LearningItemKind } from '@src/type/learning'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { cn } from '@renderer/lib/utils'
import useLearningCollection, { type LearningKindFilter } from './useLearningCollection'
import LearningItemDetails from './components/LearningItemDetails'
import '../../scroll.css'

/** 收藏筛选项 */
const FILTER_OPTIONS: ReadonlyArray<{ value: LearningKindFilter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'word', label: '单词' },
  { value: 'sentence', label: '句子' }
]

/** 收藏类型文案映射 */
const KIND_LABELS: Readonly<Record<LearningItemKind, string>> = {
  word: '单词',
  sentence: '句子'
}

/** 收藏来源文案映射 */
const SOURCE_LABELS: Readonly<Record<LearningItem['source'], string>> = {
  text: '文本翻译',
  screenshot: '截图翻译'
}

/**
 * 格式化收藏时间
 * @param timestamp 时间戳
 * @returns 本地日期时间
 */
function formatLearningTime(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(timestamp)
}

/**
 * 判断收藏记录是否包含可展开详情
 * @param item 学习收藏记录
 * @returns 是否包含详细学习内容
 */
function hasLearningDetails(item: LearningItem): boolean {
  return Boolean(item.sentenceAnalysis || item.translationResult?.exampleSentences?.length)
}

/** 渲染学习收藏页面 */
export default function LearningCollectionPage(): React.JSX.Element {
  // 收藏页状态与交互
  const {
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
  } = useLearningCollection()
  // 当前是否启用了筛选
  const hasActiveFilter = Boolean(query.trim()) || kindFilter !== 'all'

  return (
    <div className="mx-auto min-h-full w-full max-w-[1180px] px-5 py-5 lg:px-7 lg:py-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-foreground">学习收藏</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            收拢值得再次理解和朗读的单词与句子。
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          共 {total} 条 · 当前 {items.length} 条
        </p>
      </header>

      <section className="lab-panel mt-5 overflow-hidden" aria-busy={isLoading}>
        <div className="flex flex-col gap-3 border-b border-border bg-muted/30 p-3 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              size={15}
            />
            <span className="sr-only">搜索学习收藏</span>
            <Input
              className="pl-9"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索原文或译文"
              value={query}
            />
          </label>
          <div className="flex items-center gap-1" aria-label="收藏类型筛选">
            {FILTER_OPTIONS.map((option) => (
              <Button
                aria-pressed={kindFilter === option.value}
                className="cursor-pointer"
                key={option.value}
                onClick={() => setKindFilter(option.value)}
                size="sm"
                variant={kindFilter === option.value ? 'secondary' : 'ghost'}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {isLoading && (
          <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="animate-spin text-primary" size={17} />
            正在读取收藏
          </div>
        )}

        {!isLoading && errorMessage && (
          <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
            <CircleAlert className="text-destructive" size={22} />
            <p className="mt-3 text-sm font-medium">收藏数据暂不可用</p>
            <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">{errorMessage}</p>
            <Button className="mt-4" onClick={() => void loadItems()} size="sm" variant="outline">
              重新读取
            </Button>
          </div>
        )}

        {!isLoading && !errorMessage && items.length === 0 && (
          <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
            {hasActiveFilter ? (
              <Search className="text-muted-foreground" size={19} />
            ) : (
              <Bookmark className="text-muted-foreground" size={19} />
            )}
            <p className="mt-3 text-sm font-medium">
              {hasActiveFilter ? '没有匹配的收藏' : '还没有学习收藏'}
            </p>
            <p className="mt-1.5 max-w-sm text-xs leading-5 text-muted-foreground">
              {hasActiveFilter
                ? '尝试缩短关键词或切换内容类型。'
                : '在文本翻译结果或截图翻译浮层中点击收藏。'}
            </p>
          </div>
        )}

        {!isLoading && !errorMessage && items.length > 0 && (
          <div className="divide-y divide-border">
            {items.map((item) => {
              // 当前记录是否展开
              const isExpanded = expandedItemId === item.id
              // 当前记录是否正在朗读
              const isSpeaking = speakingItemId === item.id
              // 当前记录是否正在删除
              const isRemoving = removingItemId === item.id
              // 当前记录是否包含详情
              const hasDetails = hasLearningDetails(item)

              return (
                <article key={item.id}>
                  <div className="group px-5 py-4 transition-colors hover:bg-accent/20">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-foreground">
                        {KIND_LABELS[item.kind]}
                      </span>
                      <span className="text-xs text-muted-foreground">{SOURCE_LABELS[item.source]}</span>
                      <time className="ml-auto text-xs text-muted-foreground">
                        {formatLearningTime(item.updatedAt)}
                      </time>
                    </div>

                    <p className="mt-2 whitespace-pre-wrap break-words text-[15px] font-medium leading-7 text-foreground">
                      {item.originalText}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                      {item.translatedText}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-1">
                      {hasDetails && (
                        <Button
                          aria-expanded={isExpanded}
                          className="cursor-pointer"
                          onClick={() => toggleExpandedItem(item.id)}
                          size="sm"
                          variant="ghost"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          {isExpanded ? '收起详情' : '查看详情'}
                        </Button>
                      )}
                      <Button
                        aria-label="复制原文与译文"
                        onClick={() => copyLearningItem(item)}
                        className="size-8 cursor-pointer"
                        size="icon"
                        title="复制原文与译文"
                        variant="ghost"
                      >
                        <Copy size={14} />
                      </Button>
                      <Button
                        aria-label={isSpeaking ? '停止朗读原文' : '朗读原文'}
                        aria-pressed={isSpeaking}
                        className="size-8 cursor-pointer"
                        onClick={() => toggleLearningItemSpeech(item)}
                        size="icon"
                        title={isSpeaking ? '停止朗读原文' : '朗读原文'}
                        variant="ghost"
                      >
                        {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                      </Button>
                      <Button
                        aria-label="取消收藏"
                        className={cn(
                          'ml-auto size-8 cursor-pointer',
                          isRemoving && 'cursor-not-allowed'
                        )}
                        disabled={isRemoving}
                        onClick={() => void removeItem(item.id)}
                        size="icon"
                        title="取消收藏"
                        variant="ghost"
                      >
                        {isRemoving ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </Button>
                    </div>
                  </div>

                  {isExpanded && <LearningItemDetails item={item} />}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
