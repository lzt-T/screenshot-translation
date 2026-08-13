import { useEffect, useRef } from 'react'
import { Check, Sparkles, Volume2, VolumeX } from 'lucide-react'
import type { ConversationMessage } from '@src/type/conversation'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'

/** 对话记录属性 */
interface ConversationTranscriptProps {
  /** 当前会话消息 */
  messages: ConversationMessage[]
  /** 当前是否允许手动朗读 */
  canPlaySpeech: boolean
  /** 当前手动朗读目标 */
  speakingTarget: string | null
  /** 切换手动朗读回调 */
  onToggleSpeech: (target: string, text: string) => void
}

/** 单条英文朗读按钮属性 */
interface SpeechButtonProps {
  /** 朗读目标标识 */
  target: string
  /** 待朗读英文 */
  text: string
  /** 当前是否允许手动朗读 */
  canPlay: boolean
  /** 当前手动朗读目标 */
  speakingTarget: string | null
  /** 朗读内容名称 */
  label: string
  /** 切换手动朗读回调 */
  onToggle: (target: string, text: string) => void
}

/** 渲染单条英文的朗读控制 */
function SpeechButton({
  target,
  text,
  canPlay,
  speakingTarget,
  label,
  onToggle
}: SpeechButtonProps): React.JSX.Element {
  // 当前英文是否正在朗读
  const isSpeaking = speakingTarget === target
  // 当前按钮操作说明
  const actionLabel = isSpeaking ? `停止朗读${label}` : `朗读${label}`
  return (
    <Button
      aria-label={actionLabel}
      aria-pressed={isSpeaking}
      className="size-7 shrink-0 cursor-pointer"
      disabled={!canPlay && !isSpeaking}
      onClick={() => onToggle(target, text)}
      size="icon"
      title={actionLabel}
      type="button"
      variant="ghost"
    >
      {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
    </Button>
  )
}

/** 渲染按时间排列的英语对话与纠错记录 */
export default function ConversationTranscript({
  messages,
  canPlaySpeech,
  speakingTarget,
  onToggleSpeech
}: ConversationTranscriptProps): React.JSX.Element {
  // 对话记录滚动容器
  const transcriptRef = useRef<HTMLDivElement | null>(null)

  /** 新消息出现时滚动至最新内容 */
  useEffect(() => {
    // 当前对话记录滚动容器
    const transcriptElement = transcriptRef.current
    if (transcriptElement) {
      transcriptElement.scrollTop = transcriptElement.scrollHeight
    }
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <Sparkles className="text-muted-foreground" size={18} />
        <p className="mt-3 text-sm font-medium text-foreground">对话会从一句轻松的问候开始</p>
        <p className="mt-1.5 max-w-sm text-xs leading-5 text-muted-foreground">
          AI 会用英语与你交谈，并在需要时给出更自然的表达建议。
        </p>
      </div>
    )
  }

  return (
    <div
      aria-label="当前对话记录"
      className="custom-scrollbar min-h-0 flex-1 overflow-y-auto"
      ref={transcriptRef}
    >
      {messages.map((message) => {
        // 当前消息是否来自用户
        const isUserMessage = message.role === 'user'
        // 消息正文朗读目标
        const messageSpeechTarget = `${message.id}:message`
        // 表达建议朗读目标
        const correctionSpeechTarget = `${message.id}:correction`
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
                  'relative max-w-[85%] rounded-lg py-2 pl-3 pr-10 text-left',
                  isUserMessage ? 'bg-muted' : 'bg-muted/45'
                )}
              >
                <div className="absolute right-2 top-2">
                  <SpeechButton
                    canPlay={canPlaySpeech}
                    label={isUserMessage ? '我的英文' : '教练英文'}
                    onToggle={onToggleSpeech}
                    speakingTarget={speakingTarget}
                    target={messageSpeechTarget}
                    text={message.text}
                  />
                </div>
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
                <div className="relative mt-3 max-w-[85%] rounded-lg border border-primary/15 bg-primary/7 py-3 pl-3 pr-10 text-left">
                  <div className="absolute right-2 top-2">
                    <SpeechButton
                      canPlay={canPlaySpeech}
                      label="更自然的表达"
                      onToggle={onToggleSpeech}
                      speakingTarget={speakingTarget}
                      target={correctionSpeechTarget}
                      text={message.correction.suggestedText}
                    />
                  </div>
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
    </div>
  )
}
