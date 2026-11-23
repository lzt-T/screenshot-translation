import React from 'react'
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Loader2,
  MessageCircleMore,
  Search,
  Trash2,
  X
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { LearningItem, LearningItemKind } from '@src/type/learning'
import CopyIconButton from '@renderer/components/CopyIconButton'
import SpeakingIndicator from '@renderer/components/SpeakingIndicator'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { cn } from '@renderer/lib/utils'
import useLearningCollection, { type LearningKindFilter } from './useLearningCollection'
import LearningItemDetails from './components/LearningItemDetails'

/** 收藏筛选项 */
const FILTER_OPTIONS: ReadonlyArray<{ value: LearningKindFilter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'word', label: '单词' },
  { value: 'sentence', label: '句子' }
]

/** 收藏类型文案与温润徽标样式映射 */
const KIND_META_MAP: Readonly<Record<LearningItemKind, { label: string; className: string }>> = {
  word: {
    label: '单词',
    className: 'border-marginalia-border/80 bg-marginalia text-marginalia-foreground'
  },
  sentence: {
    label: '句子',
    className: 'border-border/80 bg-muted/70 text-muted-foreground'
  }
}

/** 收藏来源文案映射 */
const SOURCE_LABELS: Readonly<Record<LearningItem['source'], string>> = {
  text: '文本翻译',
  screenshot: '截图翻译'
}

/** 格式化收藏时间 */
function formatLearningTime(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(timestamp)
}

/** 判断收藏记录是否包含可展开详情 */
function hasLearningDetails(item: LearningItem): boolean {
  return Boolean(item.sentenceAnalysis || item.translationResult?.exampleSentences?.length)
}

/**
 * 渲染纯净顶栏与辞书词条排版的学习收藏页面
 * @returns {React.JSX.Element} 收藏页节点
 */
export default function LearningCollectionPage(): React.JSX.Element {
  const navigate = useNavigate()
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
  const hasActiveFilter = Boolean(query.trim()) || kindFilter !== 'all'

  /** 将当前收藏条目送入口语对话练习 */
  const handlePracticeItem = (item: LearningItem): void => {
    navigate('/conversation', {
      state: { practiceText: item.originalText.trim() }
    })
  }

  return (
    <div className="mx-auto min-h-full w-full max-w-[1200px] px-5 py-4 lg:px-7 lg:py-5">
      <h1 className="sr-only">学习收藏</h1>

      <section className="lexicon-sheet overflow-hidden" aria-busy={isLoading}>
        <div className="flex flex-col gap-3 border-b border-border/55 px-5 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div
              aria-label="收藏类型筛选"
              className="flex items-center gap-0.5 rounded-md bg-muted/70 p-0.5"
              role="group"
            >
              {FILTER_OPTIONS.map((option) => {
                const isSelected = kindFilter === option.value
                return (
                  <button
                    aria-pressed={isSelected}
                    className={cn(
                      'h-7 cursor-pointer rounded-sm px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45',
                      isSelected
                        ? 'bg-card text-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    key={option.value}
                    onClick={() => setKindFilter(option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>

            <span className="text-xs text-muted-foreground/85">
              {hasActiveFilter ? `${items.length} / ${total} 条` : `共 ${total} 条`}
            </span>
          </div>

          <label className="relative w-full sm:w-72">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              size={14}
            />
            <span className="sr-only">搜索学习收藏</span>
            <Input
              className={cn('h-8 pl-8 text-xs', query && 'pr-8')}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索原文或译文…"
              value={query}
            />
            {query && (
              <button
                aria-label="清空搜索关键词"
                className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45"
                onClick={() => setQuery('')}
                title="清空搜索"
                type="button"
              >
                <X size={13} />
              </button>
            )}
          </label>
        </div>

        {isLoading && (
          <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="animate-spin text-foreground" size={17} />
            正在读取收藏
          </div>
        )}

        {!isLoading && errorMessage && (
          <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
            <CircleAlert className="text-destructive" size={22} />
            <p className="mt-3 text-sm font-medium">收藏数据暂不可用</p>
            <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">{errorMessage}</p>
            <Button
              className="mt-4 cursor-pointer"
              onClick={() => void loadItems()}
              size="sm"
              variant="outline"
            >
              重新读取
            </Button>
          </div>
        )}

        {!isLoading && !errorMessage && items.length === 0 && (
          <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
            <div className="mb-3 flex size-9 items-center justify-center rounded-lg border border-border bg-muted/45 text-muted-foreground">
              {hasActiveFilter ? <Search size={17} /> : <Bookmark size={17} />}
            </div>
            <p className="text-sm font-medium text-foreground">
              {hasActiveFilter ? '没有匹配的收藏' : '还没有学习收藏'}
            </p>
            <p className="mt-1.5 max-w-sm text-xs leading-5 text-muted-foreground">
              {hasActiveFilter
                ? '尝试缩短关键词或切换内容类型。'
                : '在文本翻译、对话纠错或截图浮层中点击收藏即可存入。'}
            </p>
          </div>
        )}

        {!isLoading && !errorMessage && items.length > 0 && (
          <div className="divide-y divide-border/60">
            {items.map((item) => {
              const isExpanded = expandedItemId === item.id
              const isSpeaking = speakingItemId === item.id
              const isRemoving = removingItemId === item.id
              const hasDetails = hasLearningDetails(item)
              const kindMeta = KIND_META_MAP[item.kind]

              return (
                <article className="lexicon-reveal" key={item.id}>
                  <div className="group px-5 py-4 transition-colors hover:bg-accent/25">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={kindMeta.className} variant="outline">
                        {kindMeta.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {SOURCE_LABELS[item.source]}
                      </span>
                      <time className="ml-auto text-xs text-muted-foreground/85">
                        {formatLearningTime(item.updatedAt)}
                      </time>
                    </div>

                    <p className="mt-2.5 whitespace-pre-wrap break-words text-[15px] font-medium leading-7 text-foreground">
                      {item.originalText}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                      {item.translatedText}
                    </p>

                    <div className="-ml-2.5 mt-3 flex flex-wrap items-center gap-1">
                      {hasDetails && (
                        <Button
                          aria-expanded={isExpanded}
                          className="h-7.5 cursor-pointer px-2.5 text-xs"
                          onClick={() => toggleExpandedItem(item.id)}
                          size="sm"
                          variant="ghost"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          {isExpanded ? '收起批注' : '查看批注'}
                        </Button>
                      )}
                      <Button
                        className="h-7.5 cursor-pointer px-2.5 text-xs"
                        onClick={() => handlePracticeItem(item)}
                        size="sm"
                        title="带入对话练习开口表达"
                        variant="ghost"
                      >
                        <MessageCircleMore size={13} />
                        练口语
                      </Button>

                      <div
                        className={cn(
                          'flex items-center gap-0.5 opacity-60 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100',
                          (isSpeaking || isRemoving) && 'opacity-100'
                        )}
                      >
                        <CopyIconButton
                          ariaLabel="复制原文与译文"
                          onCopy={() => copyLearningItem(item)}
                          title="复制原文与译文"
                        />
                        <Button
                          aria-label={isSpeaking ? '停止朗读原文' : '朗读原文'}
                          aria-pressed={isSpeaking}
                          className="size-7.5 cursor-pointer"
                          onClick={() => toggleLearningItemSpeech(item)}
                          size="icon"
                          title={isSpeaking ? '停止朗读原文' : '朗读原文'}
                          variant="ghost"
                        >
                          <SpeakingIndicator isSpeaking={isSpeaking} />
                        </Button>
                        <Button
                          aria-label="取消收藏"
                          className={cn(
                            'size-7.5 cursor-pointer text-muted-foreground hover:text-destructive',
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
