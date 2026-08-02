import React from 'react'
import { BookOpenCheck, Braces, Loader2, Puzzle } from 'lucide-react'
import { SentenceAnalysis } from '@src/type/base'
import { Button } from '@renderer/components/ui/button'

/** 句子分析展示属性 */
interface SentenceAnalysisViewProps {
  /* 句子分析结果 */
  analysis: SentenceAnalysis | null
  /* 是否正在分析 */
  isLoading: boolean
  /* 分析错误信息 */
  errorMessage: string
  /* 发起分析回调 */
  onAnalyze: () => void
}

/**
 * 渲染句子分析的等待状态
 * @returns {React.JSX.Element} 分析等待节点
 */
function SentenceAnalysisLoading(): React.JSX.Element {
  return (
    <div aria-live="polite" className="space-y-3 px-5 py-5" role="status">
      <div className="h-4 w-3/4 animate-pulse rounded bg-accent" />
      <div className="h-3 w-full animate-pulse rounded bg-accent/75" />
      <div className="h-3 w-5/6 animate-pulse rounded bg-accent/75" />
    </div>
  )
}

/**
 * 渲染英文句子分析结果
 * @param {SentenceAnalysisViewProps} props 组件属性
 * @returns {React.JSX.Element} 句子分析节点
 */
export default function SentenceAnalysisView({
  analysis,
  isLoading,
  errorMessage,
  onAnalyze
}: SentenceAnalysisViewProps): React.JSX.Element {
  return (
    <section aria-busy={isLoading} aria-label="英文句子分析" className="border-t border-border">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-accent/35 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <BookOpenCheck aria-hidden="true" className="shrink-0 text-primary" size={16} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">句子理解</p>
            {!analysis && !errorMessage && (
              <p className="mt-0.5 text-xs text-muted-foreground">拆解结构、关键短语和语法</p>
            )}
          </div>
        </div>
        {!analysis && (
          <Button disabled={isLoading} onClick={onAnalyze} size="sm" variant="outline">
            {isLoading && <Loader2 aria-hidden="true" className="animate-spin" size={14} />}
            {isLoading ? '分析中' : errorMessage ? '重新分析' : '分析句子'}
          </Button>
        )}
      </div>

      {isLoading && <SentenceAnalysisLoading />}

      {!isLoading && errorMessage && (
        <p className="px-5 py-4 text-sm leading-6 text-destructive" role="alert">
          {errorMessage}
        </p>
      )}

      {!isLoading && analysis && (
        <div className="divide-y divide-border animate-in fade-in duration-200">
          {analysis.sentences.map((sentence, sentenceIndex) => (
            <article className="px-5 py-5" key={`${sentence.sourceText}-${sentenceIndex}`}>
              <p className="measurement-label">句子 {sentenceIndex + 1}</p>
              <p className="mt-2 break-words text-[15px] font-medium leading-7 text-foreground">
                {sentence.sourceText}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {sentence.structureSummary}
              </p>

              <div className="mt-5">
                <div className="flex items-center gap-2">
                  <Braces aria-hidden="true" className="text-primary" size={15} />
                  <h3 className="text-sm font-medium text-foreground">句子结构</h3>
                </div>
                <div className="mt-2 divide-y divide-border border-y border-border">
                  {sentence.chunks.map((chunk, chunkIndex) => (
                    <div className="py-3" key={`${chunk.text}-${chunkIndex}`}>
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="break-words text-sm font-medium text-foreground">
                          {chunk.text}
                        </span>
                        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                          {chunk.role}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{chunk.meaning}</p>
                    </div>
                  ))}
                </div>
              </div>

              {sentence.keyPhrases.length > 0 && (
                <div className="mt-5">
                  <div className="flex items-center gap-2">
                    <Puzzle aria-hidden="true" className="text-primary" size={15} />
                    <h3 className="text-sm font-medium text-foreground">关键短语</h3>
                  </div>
                  <dl className="mt-2 space-y-2">
                    {sentence.keyPhrases.map((phrase, phraseIndex) => (
                      <div key={`${phrase.phrase}-${phraseIndex}`}>
                        <dt className="text-sm font-medium text-foreground">{phrase.phrase}</dt>
                        <dd className="mt-0.5 text-sm leading-6 text-muted-foreground">
                          {phrase.meaning}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {sentence.grammarPoints.length > 0 && (
                <div className="mt-5">
                  <p className="text-sm font-medium text-foreground">语法要点</p>
                  <dl className="mt-2 space-y-3">
                    {sentence.grammarPoints.map((grammarPoint, grammarPointIndex) => (
                      <div key={`${grammarPoint.name}-${grammarPointIndex}`}>
                        <dt className="text-sm font-medium text-foreground">{grammarPoint.name}</dt>
                        <dd className="mt-0.5 text-sm leading-6 text-muted-foreground">
                          {grammarPoint.explanation}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
