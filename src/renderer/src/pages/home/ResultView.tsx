import React from 'react'
import { BookOpen, ScanText } from 'lucide-react'
import { Language, TextType, TranslateResponse } from '@src/type/base'
import { cn } from '@renderer/lib/utils'

/** 翻译结果属性 */
interface ResultViewProps {
  /* 翻译结果 */
  result: TranslateResponse | null
  /* 是否正在翻译 */
  isLoading: boolean
}

/**
 * 渲染翻译结果与等待状态
 * @param {ResultViewProps} props 组件属性
 * @returns {React.JSX.Element} 翻译结果区域
 */
export default function ResultView({ result, isLoading }: ResultViewProps): React.JSX.Element {
  // 当前结果是否是单词
  const isWord = result?.textType === TextType.WORD

  if (!result) {
    return (
      <div className="lab-panel flex min-h-56 items-center justify-center overflow-hidden px-8 py-10">
        <div className="max-w-xs text-center">
          <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-xl bg-accent text-muted-foreground">
            <ScanText size={20} />
          </div>
          <p className="text-sm font-medium text-foreground">
            {isLoading ? '正在识别与翻译' : '译文将在这里显现'}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {isLoading ? '请稍候，处理完成后会保留原有段落结构。' : '从截图开始，或在左侧输入文字。'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="lab-panel min-h-56 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex h-12 items-center justify-between border-b border-border px-4">
        <span className="measurement-label">Translation layer</span>
        <span className="rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
          已完成
        </span>
      </div>

      {!isWord && (
        <div className="divide-y divide-border">
          {result.translation?.map((item, index) => (
            <div className="px-5 py-4 transition-colors hover:bg-accent/35" key={index}>
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
          ))}
        </div>
      )}

      {isWord && result.exampleSentences && result.exampleSentences.length > 0 && (
        <div>
          <div className="flex items-center gap-2 border-b border-border bg-accent/45 px-4 py-3">
            <BookOpen size={15} className="text-primary" />
            <span className="text-sm font-medium">例句观察</span>
          </div>
          <div className="divide-y divide-border">
            {result.exampleSentences.map((item, index) => (
              <div className="px-5 py-4 hover:bg-accent/30" key={index}>
                {item.partOfSpeech && (
                  <span className="measurement-label">
                    {item.partOfSpeech} · {item.wordTranslation}
                  </span>
                )}
                <p className={cn('text-[15px] leading-7 text-foreground', item.partOfSpeech && 'mt-2')}>
                  {item.en}
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.zh}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
