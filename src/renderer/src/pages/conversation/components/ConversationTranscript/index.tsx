import { useEffect, useRef } from 'react'
import { Check, Sparkles } from 'lucide-react'
import type { ConversationMessage } from '@src/type/conversation'
import { cn } from '@renderer/lib/utils'

/** 对话记录属性 */
interface ConversationTranscriptProps {
  /** 当前会话消息 */
  messages: ConversationMessage[]
}

/** 渲染按时间排列的英语对话与纠错记录 */
export default function ConversationTranscript({
  messages
}: ConversationTranscriptProps): React.JSX.Element {
  // 对话记录底部锚点
  const transcriptEndRef = useRef<HTMLDivElement | null>(null)

  /** 新消息出现时滚动至最新内容 */
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center px-6 py-12 text-center">
        <Sparkles className="text-muted-foreground" size={18} />
        <p className="mt-3 text-sm font-medium text-foreground">对话会从一句轻松的问候开始</p>
        <p className="mt-1.5 max-w-sm text-xs leading-5 text-muted-foreground">
          AI 会用英语与你交谈，并在需要时给出更自然的表达建议。
        </p>
      </div>
    )
  }

  return (
    <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto" aria-label="当前对话记录">
      {messages.map((message) => {
        // 当前消息是否来自用户
        const isUserMessage = message.role === 'user'
        return (
          <article
            className="flex flex-col gap-2 border-b border-border px-4 py-4 sm:px-5"
            key={message.id}
          >
            <div
              className={cn(
                'flex items-start pt-0.5 text-xs font-medium text-muted-foreground',
                isUserMessage ? 'justify-end pr-1' : 'pl-1'
              )}
            >
              <span>{isUserMessage ? '我' : '教练'}</span>
            </div>

            <div
              className={cn(
                'flex min-w-0 flex-col',
                isUserMessage ? 'items-end' : 'items-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-lg px-3 py-2 text-left',
                  isUserMessage ? 'bg-muted' : 'bg-muted/45'
                )}
              >
                <p className="whitespace-pre-wrap text-[15px] leading-7 text-foreground">
                  {message.text}
                </p>
                {message.translation && (
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {message.translation}
                  </p>
                )}
              </div>

              {message.correction && (
                <div className="mt-3 max-w-[85%] rounded-lg border border-primary/15 bg-primary/7 px-3 py-3 text-left">
                  <div className="flex items-center gap-2 text-xs font-medium text-primary">
                    <Sparkles size={14} />
                    更自然的表达
                  </div>
                  <p className="mt-1.5 text-sm font-medium leading-6 text-foreground">
                    {message.correction.suggestedText}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {message.correction.explanation}
                  </p>
                </div>
              )}

              {isUserMessage && message.correction === null && (
                <div className="mt-2 flex items-center gap-1.5 pr-1 text-xs text-muted-foreground">
                  <Check size={13} />
                  表达自然，无需纠正
                </div>
              )}
            </div>
          </article>
        )
      })}
      <div ref={transcriptEndRef} />
    </div>
  )
}
