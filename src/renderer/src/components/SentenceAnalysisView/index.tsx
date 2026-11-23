import React from 'react'
import { BookOpenCheck, Braces, Lightbulb, Loader2, Puzzle } from 'lucide-react'
import { Language, LearningAnalysis, TranslationInsights } from '@src/type/base'
import { cn } from '@renderer/lib/utils'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'

/** 句子分析展示属性 */
interface SentenceAnalysisViewProps {
  /* 句子分析结果 */
  analysis: LearningAnalysis | null
  /* 原文语言 */
  sourceLanguage: Language
  /* 是否正在分析 */
  isLoading: boolean
  /* 分析错误信息 */
  errorMessage: string
  /* 发起分析回调 */
  onAnalyze: () => void
}

/** 渲染句子分析的等待骨架屏 */
function SentenceAnalysisLoading(): React.JSX.Element {
  return (
    <div aria-live="polite" className="space-y-3 px-5 py-5" role="status">
      <div className="h-4 w-3/4 animate-pulse rounded-sm bg-accent" />
      <div className="h-3 w-full animate-pulse rounded-sm bg-accent/75" />
      <div className="h-3 w-5/6 animate-pulse rounded-sm bg-accent/75" />
    </div>
  )
}

/** 判断分析结果是否为中文译英翻译要点 */
function isTranslationInsights(analysis: LearningAnalysis): analysis is TranslationInsights {
  return 'type' in analysis && analysis.type === 'translation-insights'
}

/**
 * 渲染边注批注风格的句子结构与翻译要点拆解
 * @param {SentenceAnalysisViewProps} props 组件属性
 * @returns {React.JSX.Element} 句子分析节点
 */
export default function SentenceAnalysisView({
  analysis,
  sourceLanguage,
  isLoading,
  errorMessage,
  onAnalyze
}: SentenceAnalysisViewProps): React.JSX.Element {
  const showsTranslationInsights = sourceLanguage === Language.ZH
  const title = showsTranslationInsights ? '翻译要点批注' : '句子理解批注'
  const description = showsTranslationInsights
    ? '梳理表达思路和关键英文搭配'
    : '拆解句法结构、核心短语与语法'
  const actionLabel = showsTranslationInsights ? '查看要点' : '分析句子'
  const hasCardBody = isLoading || Boolean(analysis) || Boolean(errorMessage)

  return (
    <section aria-busy={isLoading} aria-label={title} className="p-4">
      <div className="marginalia-card overflow-hidden">
        <div
          className={cn(
            'flex flex-wrap items-center justify-between gap-3 px-4 py-3',
            hasCardBody && 'border-b border-marginalia-border/70'
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <BookOpenCheck
              aria-hidden="true"
              className="shrink-0 text-marginalia-foreground"
              size={16}
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{title}</p>
              {!analysis && !errorMessage && (
                <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
          {!analysis && (
            <Button
              className="cursor-pointer"
              disabled={isLoading}
              onClick={onAnalyze}
              size="sm"
              variant="outline"
            >
              {isLoading && <Loader2 aria-hidden="true" className="animate-spin" size={14} />}
              {isLoading ? '分析中' : errorMessage ? '重新分析' : actionLabel}
            </Button>
          )}
        </div>

        {isLoading && <SentenceAnalysisLoading />}

        {!isLoading && errorMessage && (
          <p className="px-4 py-4 text-sm leading-6 text-destructive" role="alert">
            {errorMessage}
          </p>
        )}

        {!isLoading && analysis && isTranslationInsights(analysis) && (
          <article className="lexicon-reveal px-4 py-4">
            <p className="break-words text-[15px] font-medium leading-7 text-foreground">
              {analysis.translatedText}
            </p>
            <div className="mt-4">
              <div className="flex items-center gap-2">
                <Lightbulb aria-hidden="true" className="text-marginalia-foreground" size={15} />
                <h3 className="text-sm font-medium text-foreground">表达思路</h3>
              </div>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                {analysis.expressionStrategy}
              </p>
            </div>

            {analysis.keyExpressions.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <Puzzle aria-hidden="true" className="text-marginalia-foreground" size={15} />
                  <h3 className="text-sm font-medium text-foreground">关键表达</h3>
                </div>
                <dl className="mt-2 divide-y divide-marginalia-border/60 border-t border-marginalia-border/60">
                  {analysis.keyExpressions.map((item, index) => (
                    <div className="py-2.5" key={`${item.expression}-${index}`}>
                      <dt className="text-sm font-medium text-foreground">{item.expression}</dt>
                      <dd className="mt-1 text-sm leading-6 text-muted-foreground">
                        {item.explanation}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </article>
        )}

        {!isLoading && analysis && !isTranslationInsights(analysis) && (
          <div className="lexicon-reveal divide-y divide-marginalia-border/60">
            {analysis.sentences.map((sentence, sentenceIndex) => (
              <article className="px-4 py-4" key={`${sentence.sourceText}-${sentenceIndex}`}>
                <p className="text-xs font-medium text-marginalia-foreground">
                  句子 {sentenceIndex + 1}
                </p>
                <p className="mt-1.5 break-words text-[15px] font-medium leading-7 text-foreground">
                  {sentence.sourceText}
                </p>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                  {sentence.structureSummary}
                </p>

                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <Braces aria-hidden="true" className="text-marginalia-foreground" size={15} />
                    <h3 className="text-sm font-medium text-foreground">句子结构</h3>
                  </div>
                  <div className="mt-2 divide-y divide-marginalia-border/50 border-t border-marginalia-border/60">
                    {sentence.chunks.map((chunk, chunkIndex) => (
                      <div className="py-2.5" key={`${chunk.text}-${chunkIndex}`}>
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className="break-words text-sm font-medium text-foreground">
                            {chunk.text}
                          </span>
                          <Badge className="bg-card/85 text-muted-foreground" variant="outline">
                            {chunk.role}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {chunk.meaning}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {sentence.keyPhrases.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2">
                      <Puzzle aria-hidden="true" className="text-marginalia-foreground" size={15} />
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
                  <div className="mt-4">
                    <p className="text-sm font-medium text-foreground">语法要点</p>
                    <dl className="mt-2 space-y-2.5">
                      {sentence.grammarPoints.map((grammarPoint, grammarPointIndex) => (
                        <div key={`${grammarPoint.name}-${grammarPointIndex}`}>
                          <dt className="text-sm font-medium text-foreground">
                            {grammarPoint.name}
                          </dt>
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
      </div>
    </section>
  )
}
