import React from 'react'
import { BookOpen } from 'lucide-react'
import type { LearningItem } from '@src/type/learning'
import SentenceAnalysisView from '@renderer/components/SentenceAnalysisView'

/** 收藏记录详情属性 */
interface LearningItemDetailsProps {
  /* 学习收藏记录 */
  item: LearningItem
}

/**
 * 渲染收藏记录详情
 * @param props 收藏记录详情属性
 * @returns 收藏详情节点
 */
export default function LearningItemDetails({
  item
}: LearningItemDetailsProps): React.JSX.Element {
  // 单词例句列表
  const exampleSentences = item.translationResult?.exampleSentences || []

  return (
    <div className="border-t border-border bg-accent/20">
      {exampleSentences.length > 0 && (
        <section className="px-5 py-5" aria-label="单词例句">
          <div className="flex items-center gap-2">
            <BookOpen className="text-primary" size={15} />
            <h3 className="text-sm font-medium">例句观察</h3>
          </div>
          <div className="mt-3 divide-y divide-border border-y border-border">
            {exampleSentences.map((example, index) => (
              <div className="py-3" key={`${example.en}-${index}`}>
                {(example.partOfSpeech || example.wordTranslation) && (
                  <p className="measurement-label">
                    {[example.partOfSpeech, example.wordTranslation].filter(Boolean).join(' · ')}
                  </p>
                )}
                <p className="mt-1 text-sm leading-6 text-foreground">{example.en}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{example.zh}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {item.sentenceAnalysis && (
        <SentenceAnalysisView
          analysis={item.sentenceAnalysis}
          errorMessage=""
          isLoading={false}
          onAnalyze={() => undefined}
        />
      )}
    </div>
  )
}
