import React from 'react'
import { BookOpen, CircleAlert, Copy, Loader2, ScanText, Volume2, VolumeX } from 'lucide-react'
import {
  ExampleSentence,
  Language,
  SentenceAnalysis,
  TextType,
  TranslateResponse
} from '@src/type/base'
import { cn } from '@renderer/lib/utils'
import { Button } from '@renderer/components/ui/button'
import SentenceAnalysisView from './SentenceAnalysisView'

/** 译文面板状态 */
type ResultStatus = 'idle' | 'loading' | 'error' | 'success'

/** 译文面板状态配置 */
const RESULT_STATUS_CONFIG: Record<ResultStatus, { label: string; className: string }> = {
  idle: { label: '等待输入', className: 'bg-accent text-muted-foreground' },
  loading: { label: '翻译中', className: 'bg-primary/10 text-primary' },
  error: { label: '翻译失败', className: 'bg-destructive/10 text-destructive' },
  success: { label: '已完成', className: 'bg-primary/10 text-primary' }
}

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

/**
 * 提取句子结果条目的操作文本
 * @param result 完整翻译结果
 * @param item 当前句子条目
 * @returns 当前条目的译文文本
 */
function getSentenceItemText(result: TranslateResponse, item: SentenceResultItem): string {
  if (result.sourceLanguage === Language.ZH_AND_EN) {
    return [item.en, item.zh].filter(Boolean).join('\n')
  }

  return result.targetLanguage === Language.ZH ? item.zh || '' : item.en || ''
}

/**
 * 提取单词例句条目的操作文本
 * @param item 当前例句条目
 * @returns 英文例句和中文译文
 */
function getWordItemText(item: ExampleSentence): string {
  return [item.en, item.zh].filter(Boolean).join('\n')
}

/**
 * 渲染单条译文的复制和朗读操作
 * @param props 条目操作属性
 * @returns {React.JSX.Element | null} 条目操作节点
 */
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
        'pointer-events-none absolute right-3 top-3 flex items-center gap-1 opacity-0 transition-opacity',
        'group-hover:pointer-events-auto group-hover:opacity-100',
        'group-focus-within:pointer-events-auto group-focus-within:opacity-100',
        isSpeaking && 'pointer-events-auto opacity-100'
      )}
    >
      <Button
        aria-label={`复制第 ${index + 1} 条译文`}
        className="size-8 cursor-pointer"
        onClick={() => onCopy(text)}
        size="icon"
        title="复制此条译文"
        variant="ghost"
      >
        <Copy size={14} />
      </Button>
      <Button
        aria-label={isSpeaking ? `停止朗读第 ${index + 1} 条译文` : `朗读第 ${index + 1} 条译文`}
        aria-pressed={isSpeaking}
        className="size-8 cursor-pointer"
        onClick={() => onSpeak(index, text)}
        size="icon"
        title={isSpeaking ? '停止朗读此条译文' : '朗读此条译文'}
        variant="ghost"
      >
        {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
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
  /* 复制条目回调 */
  onCopyItem: (text: string) => void
  /* 朗读条目回调 */
  onSpeakItem: (index: number, text: string) => void
  /* 是否允许分析英文句子 */
  canAnalyzeSentence: boolean
  /* 句子分析结果 */
  sentenceAnalysis: SentenceAnalysis | null
  /* 是否正在分析句子 */
  isSentenceAnalysisLoading: boolean
  /* 句子分析错误信息 */
  sentenceAnalysisError: string
  /* 分析句子回调 */
  onAnalyzeSentence: () => void
}

/**
 * 渲染翻译结果与等待状态
 * @param {ResultViewProps} props 组件属性
 * @returns {React.JSX.Element} 翻译结果区域
 */
export default function ResultView({
  result,
  isLoading,
  errorMessage,
  speakingItemIndex,
  onRetry,
  onCopyItem,
  onSpeakItem,
  canAnalyzeSentence,
  sentenceAnalysis,
  isSentenceAnalysisLoading,
  sentenceAnalysisError,
  onAnalyzeSentence
}: ResultViewProps): React.JSX.Element {
  // 当前结果是否是单词
  const isWord = result?.textType === TextType.WORD
  // 当前译文面板状态
  const resultStatus: ResultStatus = errorMessage
    ? 'error'
    : isLoading
      ? 'loading'
      : result
        ? 'success'
        : 'idle'
  // 当前状态展示配置
  const statusConfig = RESULT_STATUS_CONFIG[resultStatus]

  return (
    <div
      aria-busy={isLoading}
      className="lab-panel flex min-h-80 flex-col overflow-hidden md:min-h-[calc(100vh-13rem)]"
      role="region"
      aria-label="译文结果"
    >
      <div className="flex h-12 items-center justify-between border-b border-border px-4">
        <span className="measurement-label">译文结果</span>
        <span
          aria-live="polite"
          className={cn(
            'rounded-md px-2 py-1 text-[11px] font-medium',
            statusConfig.className
          )}
          role="status"
        >
          {statusConfig.label}
        </span>
      </div>

      {!result && (
        <div className="flex flex-1 items-center justify-center px-8 py-10">
          <div className="max-w-xs text-center">
            <div
              className={cn(
                'mx-auto mb-4 flex size-11 items-center justify-center rounded-xl bg-accent',
                errorMessage ? 'text-destructive' : 'text-muted-foreground'
              )}
            >
              {errorMessage ? (
                <CircleAlert size={20} />
              ) : isLoading ? (
                <Loader2 size={20} className="animate-spin text-primary" />
              ) : (
                <ScanText size={20} />
              )}
            </div>
            <p className="text-sm font-medium text-foreground">
              {errorMessage ? '本次翻译未完成' : isLoading ? '正在识别与翻译' : '译文将在这里显现'}
            </p>
            <p
              className="mt-2 break-words text-xs leading-5 text-muted-foreground"
              role={errorMessage ? 'alert' : undefined}
            >
              {errorMessage
                ? errorMessage
                : isLoading
                  ? '请稍候，处理完成后会保留原有段落结构。'
                  : '从截图开始，或在左侧输入文字。'}
            </p>
            {errorMessage && (
              <Button className="mt-4" onClick={onRetry} size="sm" variant="outline">
                重新翻译
              </Button>
            )}
          </div>
        </div>
      )}

      {result && !isWord && (
        <div className="divide-y divide-border animate-in fade-in slide-in-from-bottom-2 duration-300">
          {result.translation?.map((item, index) => {
            // 当前句子条目的操作文本
            const itemText = getSentenceItemText(result, item)
            return (
              <div
                className="group relative px-5 py-4 pr-24 transition-colors hover:bg-accent/35"
                key={index}
              >
                <ResultItemActions
                  index={index}
                  isSpeaking={speakingItemIndex === index}
                  onCopy={onCopyItem}
                  onSpeak={onSpeakItem}
                  text={itemText}
                />
                {result.sourceLanguage === Language.ZH_AND_EN ? (
                  <div className="space-y-2">
                    <p className="break-words text-[15px] leading-7 text-foreground">{item.en}</p>
                    <p className="break-words text-sm leading-6 text-muted-foreground">{item.zh}</p>
                  </div>
                ) : (
                  <p className="break-words text-[15px] leading-7 text-foreground">
                    {result.sourceLanguage === Language.ZH ? item.en : item.zh}
                  </p>
                )}
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
        />
      )}

      {result && isWord && result.exampleSentences && result.exampleSentences.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 border-b border-border bg-accent/45 px-4 py-3">
            <BookOpen size={15} className="text-primary" />
            <span className="text-sm font-medium">例句观察</span>
          </div>
          <div className="divide-y divide-border">
            {result.exampleSentences.map((item, index) => {
              // 当前例句条目的操作文本
              const itemText = getWordItemText(item)
              return (
                <div className="group relative px-5 py-4 pr-24 hover:bg-accent/30" key={index}>
                  <ResultItemActions
                    index={index}
                    isSpeaking={speakingItemIndex === index}
                    onCopy={onCopyItem}
                    onSpeak={onSpeakItem}
                    text={itemText}
                  />
                  {item.partOfSpeech && (
                    <span className="measurement-label">
                      {item.partOfSpeech} · {item.wordTranslation}
                    </span>
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
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
