/* 结果展示组件 */
import React, { useEffect, useMemo } from 'react'
import { TextType, TranslateResponse, Language } from '@src/type/base'
import { Badge } from '@renderer/components/ui/badge'
import { BookOpen } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

interface ResultViewProps {
  result: TranslateResponse | null
}

export default function ResultView({ result }: ResultViewProps) {
  if (!result) {
    return null
  }

  /* 是否是单词 */
  const isWord = useMemo(() => {
    return String(result.textType).toUpperCase() === String(TextType.WORD).toUpperCase()
  }, [result])

  useEffect(() => {
    console.log(result, 'sad')
  }, [result])

  return (
    <div className="w-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-6">
      {/* 翻译结果卡片 */}
      <div className="bg-card text-card-foreground rounded-xl border shadow-sm overflow-hidden transition-all hover:shadow-md">
        <div className="p-1">
          {result.translation?.map((item, index) => (
            <div
              key={index}
              className={cn(
                'group flex flex-col p-3 rounded-lg transition-colors hover:bg-muted/50',
                index !== (result.translation?.length || 0) - 1 && 'border-b border-border/50'
              )}
            >
              <div className="flex items-start gap-3">
                {/* 词性标签 */}
                {item.partOfSpeech && (
                  <Badge
                    variant="secondary"
                    className="mt-1 shrink-0 font-normal text-xs px-2 py-0.5 bg-primary/10 text-primary hover:bg-primary/20 border-0"
                  >
                    {item.partOfSpeech}
                  </Badge>
                )}

                {/* 翻译内容 */}
                <div className="flex-1 min-w-0">
                  {result.sourceLanguage === Language.ZH_AND_EN ? (
                    <div className="flex flex-col gap-1">
                      <div className="text-base tracking-tight text-foreground break-words">
                        {item.en}
                      </div>
                      <div className="text-sm text-muted-foreground break-words">{item.zh}</div>
                    </div>
                  ) : result.sourceLanguage === Language.ZH ? (
                    <div className="text-base tracking-tight text-foreground break-words">
                      {item.en}
                    </div>
                  ) : (
                    <div className="text-base tracking-tight text-foreground break-words">
                      {item.zh}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 例句卡片 */}
      {isWord && result.exampleSentences && result.exampleSentences.length > 0 && (
        <div className="bg-card text-card-foreground rounded-xl border shadow-sm overflow-hidden transition-all hover:shadow-md">
          <div className="bg-muted/30 px-4 py-3 border-b flex items-center gap-2">
            <div className="p-1 rounded-md bg-primary/10 text-primary">
              <BookOpen size={14} />
            </div>
            <span className="text-sm font-medium text-foreground/80">例句</span>
          </div>

          <div className="divide-y divide-border/50">
            {result.exampleSentences.map((item, index) => (
              <div key={index} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex flex-col gap-2">
                  {item.partOfSpeech && (
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {item.partOfSpeech}
                    </span>
                  )}
                  <div className="space-y-1">
                    <div className="text-[15px] leading-relaxed text-foreground font-medium">
                      {item.en}
                    </div>
                    <div className="text-sm leading-relaxed text-muted-foreground">{item.zh}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
