/* 结果展示组件 */
import { TextType, TranslateResponse, Language } from '@src/type/base'
import { Badge } from '@renderer/components/ui/badge'
import { BookOpen } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

interface ResultViewProps {
  result: TranslateResponse | null
}

/**
 * 展示翻译结果
 * @param {ResultViewProps} props 组件属性
 * @returns {React.ReactNode} 翻译结果视图
 */
export default function ResultView({ result }: ResultViewProps) {
  if (!result) {
    return null
  }

  // 是否是单词
  const isWord = result.textType === TextType.WORD
  // 是否存在可展示的单词例句
  const hasExampleSentences = Boolean(result.exampleSentences?.length)

  return (
    <div className="w-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-6">
      {/* 翻译结果卡片 */}
      {!isWord && (
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
      )}

      {/* 例句卡片 */}
      {isWord && (
        <div className="bg-card text-card-foreground rounded-xl border shadow-sm overflow-hidden transition-all hover:shadow-md">
          <div className="bg-muted/30 px-4 py-3 border-b flex items-center gap-2">
            <div className="p-1 rounded-md bg-primary/10 text-primary">
              <BookOpen size={14} />
            </div>
            <span className="text-sm font-medium text-foreground/80">例句</span>
          </div>

          {hasExampleSentences ? (
            <div className="divide-y divide-border/50">
              {result.exampleSentences?.map((item, index) => (
                <div key={index} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex flex-col gap-2">
                    {item.partOfSpeech && (
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {item.partOfSpeech}: {item.wordTranslation}
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
          ) : (
            <div className="p-4 text-sm text-muted-foreground">未生成有效例句，请重试</div>
          )}
        </div>
      )}
    </div>
  )
}
