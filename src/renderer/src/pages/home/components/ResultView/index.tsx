import React from 'react'
import {
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  CircleAlert,
  Loader2,
  MessageCircleMore,
  ScanLine
} from 'lucide-react'
import {
  ExampleSentence,
  Language,
  LearningAnalysis,
  TextType,
  TranslateResponse
} from '@src/type/base'
import CopyIconButton from '@renderer/components/CopyIconButton'
import SpeakingIndicator from '@renderer/components/SpeakingIndicator'
import SentenceAnalysisView from '@renderer/components/SentenceAnalysisView'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'

/** 译文面板状态 */
type ResultStatus = 'idle' | 'loading' | 'error' | 'success'

/** 译文面板状态配置 */
const RESULT_STATUS_CONFIG: Record<
  ResultStatus,
  { label: string; variant: 'secondary' | 'default' | 'destructive' }
> = {
  idle: { label: '待译', variant: 'secondary' },
  loading: { label: '翻译中', variant: 'default' },
  error: { label: '翻译失败', variant: 'destructive' },
  success: { label: '已完成', variant: 'secondary' }
}

/** 语言名称映射表 */
const LANGUAGE_LABEL_MAP: Record<Language, string> = {
  [Language.ZH]: '中文',
  [Language.EN]: '英文',
  [Language.ZH_AND_EN]: '中英混合'
}

/** 首屏可直接点击试用的高频日常例句 */
const QUICK_SAMPLE_SENTENCES: ReadonlyArray<string> = [
  'Could you walk me through this?',
  'It makes sense in the long run.',
  "Let's touch base later this week."
]

/** 单条句子翻译结果 */
type SentenceResultItem = TranslateResponse['translation'][number]

/** 条目操作属性 */
interface ResultItemActionsProps {
  /* 条目索引 */
  index: number
  /* 条目操作文本 */
  text: string
  /* 是否正在朗读 */
  isSpeaking: boolean
  /* 复制回调 */
  onCopy: (text: string) => void
  /* 朗读回调 */
  onSpeak: (index: number, text: string) => void
}

/** 根据翻译结果生成真实互译方向标签 */
function getTranslationDirectionLabel(result: TranslateResponse | null): string {
  if (!result) {
    return '译文'
  }
  if (result.sourceLanguage === Language.ZH_AND_EN) {
    return '中英对照'
  }
  return `${LANGUAGE_LABEL_MAP[result.sourceLanguage]} → ${LANGUAGE_LABEL_MAP[result.targetLanguage]}`
}

/** 提取句子结果条目的操作文本 */
function getSentenceItemText(result: TranslateResponse, item: SentenceResultItem): string {
  if (result.sourceLanguage === Language.ZH_AND_EN) {
    return [item.en, item.zh].filter(Boolean).join('\n')
  }
  return result.targetLanguage === Language.ZH ? item.zh || '' : item.en || ''
}

/** 提取单词例句条目的操作文本 */
function getWordItemText(item: ExampleSentence): string {
  return [item.en, item.zh].filter(Boolean).join('\n')
}

/** 提取查词结果中的去重词性释义摘要 */
function getWordDefinitions(
  exampleSentences: ExampleSentence[] | undefined
): Array<{ partOfSpeech: string; wordTranslation: string }> {
  if (!exampleSentences || exampleSentences.length === 0) {
    return []
  }
  const seenKeys = new Set<string>()
  const definitions: Array<{ partOfSpeech: string; wordTranslation: string }> = []
  for (const item of exampleSentences) {
    const pos = item.partOfSpeech?.trim() || ''
    const meaning = item.wordTranslation?.trim() || ''
    if (!pos && !meaning) {
      continue
    }
    const key = `${pos}::${meaning}`
    if (!seenKeys.has(key)) {
      seenKeys.add(key)
      definitions.push({ partOfSpeech: pos, wordTranslation: meaning })
    }
  }
  return definitions
}

/** 渲染紧贴文本内容的就地复制与声波朗读操作 */
function ResultItemActions({
  index,
  text,
  isSpeaking,
  onCopy,
  onSpeak
}: ResultItemActionsProps): React.JSX.Element | null {
  if (!text) {
    return null
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-0.5 opacity-60 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100',
        isSpeaking && 'opacity-100'
      )}
    >
      <CopyIconButton
        ariaLabel={`复制第 ${index + 1} 条译文`}
        onCopy={() => onCopy(text)}
        title="复制此条译文"
      />
      <Button
        aria-label={isSpeaking ? `停止朗读第 ${index + 1} 条译文` : `朗读第 ${index + 1} 条译文`}
        aria-pressed={isSpeaking}
        className={cn('size-7.5 cursor-pointer', isSpeaking && 'text-foreground')}
        onClick={() => onSpeak(index, text)}
        size="icon"
        title={isSpeaking ? '停止朗读此条译文' : '朗读此条译文'}
        type="button"
        variant="ghost"
      >
        <SpeakingIndicator isSpeaking={isSpeaking} />
      </Button>
    </div>
  )
}

/** 翻译结果属性 */
interface ResultViewProps {
  /* 翻译结果 */
  result: TranslateResponse | null
  /* 是否正在翻译 */
  isLoading: boolean
  /* 翻译错误信息 */
  errorMessage: string
  /* 正在朗读的条目索引 */
  speakingItemIndex: number | null
  /* 重试回调 */
  onRetry: () => void
  /* 触发截图翻译回调 */
  onScreenshot: () => void
  /* 选择推荐例句回调 */
  onSelectSample: (sample: string) => void
  /* 复制条目回调 */
  onCopyItem: (text: string) => void
  /* 朗读条目回调 */
  onSpeakItem: (index: number, text: string) => void
  /* 是否允许句子学习分析 */
  canAnalyzeSentence: boolean
  /* 句子分析结果 */
  sentenceAnalysis: LearningAnalysis | null
  /* 是否正在分析句子 */
  isSentenceAnalysisLoading: boolean
  /* 句子分析错误信息 */
  sentenceAnalysisError: string
  /* 分析句子回调 */
  onAnalyzeSentence: () => void
  /* 当前结果是否已收藏 */
  isBookmarked: boolean
  /* 是否正在保存收藏 */
  isBookmarkSaving: boolean
  /* 切换收藏回调 */
  onToggleBookmark: () => void
  /* 送入口语练习回调 */
  onPracticeSpeech: () => void
}

/**
 * 渲染辞书级右页译文、大号词头、短动线操作与即点即试空态
 * @param {ResultViewProps} props 组件属性
 * @returns {React.JSX.Element} 翻译结果区域
 */
export default function ResultView({
  result,
  isLoading,
  errorMessage,
  speakingItemIndex,
  onRetry,
  onScreenshot,
  onSelectSample,
  onCopyItem,
  onSpeakItem,
  canAnalyzeSentence,
  sentenceAnalysis,
  isSentenceAnalysisLoading,
  sentenceAnalysisError,
  onAnalyzeSentence,
  isBookmarked,
  isBookmarkSaving,
  onToggleBookmark,
  onPracticeSpeech
}: ResultViewProps): React.JSX.Element {
  const isWord = result?.textType === TextType.WORD
  const directionLabel = getTranslationDirectionLabel(result)
  const wordDefinitions = isWord ? getWordDefinitions(result?.exampleSentences) : []
  const resultStatus: ResultStatus = errorMessage
    ? 'error'
    : isLoading
      ? 'loading'
      : result
        ? 'success'
        : 'idle'
  const statusConfig = RESULT_STATUS_CONFIG[resultStatus]

  return (
    <div
      aria-busy={isLoading}
      aria-label="译文结果"
      className="flex min-h-80 flex-col overflow-hidden bg-reading-surface min-[780px]:min-h-0"
      role="region"
    >
      <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-border/55 px-5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">{directionLabel}</span>

          {(resultStatus === 'loading' || resultStatus === 'error') && (
            <Badge aria-live="polite" role="status" variant={statusConfig.variant}>
              {statusConfig.label}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {result && (
            <>
              <Button
                className="h-7.5 cursor-pointer px-2.5 text-xs"
                onClick={onPracticeSpeech}
                size="sm"
                title="带入此句进行英语对话练习"
                variant="ghost"
              >
                <MessageCircleMore size={13} />
                练口语
              </Button>
              <Button
                aria-pressed={isBookmarked}
                className={cn(
                  'h-7.5 cursor-pointer px-2.5 text-xs',
                  isBookmarked && 'text-foreground'
                )}
                disabled={isBookmarkSaving}
                onClick={onToggleBookmark}
                size="sm"
                title={isBookmarked ? '取消收藏' : '加入学习收藏'}
                variant="ghost"
              >
                {isBookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                {isBookmarkSaving ? '保存中' : isBookmarked ? '已收藏' : '收藏'}
              </Button>
            </>
          )}

          <Button
            className="h-7.5 cursor-pointer px-2.5 text-xs"
            onClick={onScreenshot}
            size="sm"
            title="截取屏幕区域并自动翻译 (F2)"
          >
            <ScanLine size={13} />
            <span>截图</span>
            <kbd className="rounded-sm bg-primary-foreground/18 px-1 py-0.2 font-mono text-[11px] font-normal text-primary-foreground">
              F2
            </kbd>
          </Button>
        </div>
      </div>

      <div className="custom-scrollbar min-[780px]:min-h-0 min-[780px]:flex-1 min-[780px]:overflow-y-auto">
        {!result && (
          <div className="flex min-h-64 items-center justify-center px-8 py-10 min-[780px]:h-full min-[780px]:min-h-0">
            {errorMessage ? (
              <div className="max-w-sm text-center">
                <div className="mx-auto mb-3 flex size-9 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10 text-destructive">
                  <CircleAlert size={18} />
                </div>
                <p className="text-sm font-medium text-foreground">本次翻译未完成</p>
                <p className="mt-1.5 break-words text-xs leading-5 text-muted-foreground" role="alert">
                  {errorMessage}
                </p>
                <Button className="mt-4 cursor-pointer" onClick={onRetry} size="sm" variant="outline">
                  重新翻译
                </Button>
              </div>
            ) : isLoading ? (
              <div className="max-w-sm text-center">
                <Loader2 className="mx-auto mb-3 animate-spin text-foreground" size={20} />
                <p className="text-sm font-medium text-foreground">正在识别与翻译</p>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                  请稍候，处理完成后会保留原有段落结构。
                </p>
              </div>
            ) : (
              <div className="w-full max-w-sm">
                <p className="text-sm font-medium text-foreground">
                  按 F2 截图翻译，或在左侧直接输入
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  也可以点一句常用表达，立即体验译文与句法拆解：
                </p>

                <div className="mt-4 flex flex-col gap-2">
                  {QUICK_SAMPLE_SENTENCES.map((sample) => (
                    <button
                      className="group flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-border/80 bg-card px-3.5 py-2.5 text-left text-xs font-medium text-foreground transition-colors hover:border-input hover:bg-accent/55 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45"
                      key={sample}
                      onClick={() => onSelectSample(sample)}
                      type="button"
                    >
                      <span className="truncate">{sample}</span>
                      <ArrowUpRight
                        className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                        size={14}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {result && isWord && (
          <div className="lexicon-reveal border-b border-border/60 px-6 py-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-foreground">
                {result.sourceWords}
              </h2>
              <div className="flex items-center gap-0.5">
                <CopyIconButton
                  ariaLabel="复制词头"
                  onCopy={() => onCopyItem(result.sourceWords)}
                  title="复制词头"
                />
                <Button
                  aria-label={speakingItemIndex === -1 ? '停止朗读单词' : '朗读单词'}
                  aria-pressed={speakingItemIndex === -1}
                  className={cn(
                    'size-7.5 cursor-pointer',
                    speakingItemIndex === -1 && 'text-foreground'
                  )}
                  onClick={() => onSpeakItem(-1, result.sourceWords)}
                  size="icon"
                  title={speakingItemIndex === -1 ? '停止朗读单词' : '朗读单词'}
                  type="button"
                  variant="ghost"
                >
                  <SpeakingIndicator isSpeaking={speakingItemIndex === -1} />
                </Button>
              </div>
            </div>

            {wordDefinitions.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {wordDefinitions.map((def, idx) => (
                  <div className="flex flex-wrap items-baseline gap-2" key={idx}>
                    {def.partOfSpeech && (
                      <Badge variant="secondary">{def.partOfSpeech}</Badge>
                    )}
                    <span className="text-[15px] leading-6 text-foreground">
                      {def.wordTranslation}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {result && !isWord && (
          <div className="lexicon-reveal divide-y divide-border/60">
            {result.translation?.map((item, index) => {
              const itemText = getSentenceItemText(result, item)
              const isPrimaryTranslation = index === 0
              return (
                <div
                  className="group px-6 py-4 transition-colors hover:bg-accent/35"
                  key={index}
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0">
                      {result.sourceLanguage === Language.ZH_AND_EN ? (
                        <div className="space-y-1.5">
                          <p
                            className={cn(
                              'break-words leading-7 text-foreground',
                              isPrimaryTranslation
                                ? 'text-base font-medium'
                                : 'text-[15px] text-foreground/85'
                            )}
                          >
                            {item.en}
                          </p>
                          <p className="break-words text-sm leading-6 text-muted-foreground">
                            {item.zh}
                          </p>
                        </div>
                      ) : (
                        <p
                          className={cn(
                            'break-words leading-7',
                            isPrimaryTranslation
                              ? 'text-base font-medium text-foreground'
                              : 'text-[15px] text-foreground/85'
                          )}
                        >
                          {result.sourceLanguage === Language.ZH ? item.en : item.zh}
                        </p>
                      )}
                    </div>

                    <ResultItemActions
                      index={index}
                      isSpeaking={speakingItemIndex === index}
                      onCopy={onCopyItem}
                      onSpeak={onSpeakItem}
                      text={itemText}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {canAnalyzeSentence && (
          <SentenceAnalysisView
            analysis={sentenceAnalysis}
            errorMessage={sentenceAnalysisError}
            isLoading={isSentenceAnalysisLoading}
            onAnalyze={onAnalyzeSentence}
            sourceLanguage={result?.sourceLanguage || Language.EN}
          />
        )}

        {result && isWord && result.exampleSentences && result.exampleSentences.length > 0 && (
          <div className="lexicon-reveal">
            <div className="flex items-center gap-2 border-b border-border/60 px-6 py-2.5">
              <BookOpen size={14} className="text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">例句观察</span>
            </div>
            <div className="divide-y divide-border/60">
              {result.exampleSentences.map((item, index) => {
                const itemText = getWordItemText(item)
                return (
                  <div className="group px-6 py-4 transition-colors hover:bg-accent/35" key={index}>
                    <div className="flex items-start gap-2">
                      <div className="min-w-0">
                        {item.partOfSpeech && (
                          <Badge variant="secondary">
                            {item.partOfSpeech} · {item.wordTranslation}
                          </Badge>
                        )}
                        <p
                          className={cn(
                            'text-[15px] leading-7 text-foreground',
                            item.partOfSpeech && 'mt-2'
                          )}
                        >
                          {item.en}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.zh}</p>
                      </div>

                      <ResultItemActions
                        index={index}
                        isSpeaking={speakingItemIndex === index}
                        onCopy={onCopyItem}
                        onSpeak={onSpeakItem}
                        text={itemText}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
