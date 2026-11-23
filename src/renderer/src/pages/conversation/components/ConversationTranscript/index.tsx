import { useEffect, useRef, useState } from 'react'
import { Bookmark, BookmarkCheck, Check, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { TextType } from '@src/type/base'
import type { ConversationMessage } from '@src/type/conversation'
import { getTextType } from '@src/utils/ai'
import SpeakingIndicator from '@renderer/components/SpeakingIndicator'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'
import { removeLearningItem, saveLearningItem } from '@renderer/services/learning-service'

/** 对话记录属性 */
interface ConversationTranscriptProps {
  /** 当前会话消息 */
  messages: ConversationMessage[]
  /** AI 教练是否正在组织回复 */
  isThinking?: boolean
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
  /** 额外样式类名 */
  className?: string
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
  className,
  onToggle
}: SpeechButtonProps): React.JSX.Element {
  const isSpeaking = speakingTarget === target
  const actionLabel = isSpeaking ? `停止朗读${label}` : `朗读${label}`
  return (
    <Button
      aria-label={actionLabel}
      aria-pressed={isSpeaking}
      className={cn('size-7 shrink-0 cursor-pointer', isSpeaking && 'text-foreground', className)}
      disabled={!canPlay && !isSpeaking}
      onClick={() => onToggle(target, text)}
      size="icon"
      title={actionLabel}
      type="button"
      variant="ghost"
    >
      <SpeakingIndicator isSpeaking={isSpeaking} />
    </Button>
  )
}

/**
 * 渲染居中阅读列、强对比气泡与思考中反馈的对话记录视图
 * @param props 对话记录属性
 * @returns 对话记录视图
 */
export default function ConversationTranscript({
  messages,
  isThinking = false,
  canPlaySpeech,
  speakingTarget,
  onToggleSpeech
}: ConversationTranscriptProps): React.JSX.Element {
  const transcriptRef = useRef<HTMLDivElement | null>(null)
  const [bookmarkedCorrectionMap, setBookmarkedCorrectionMap] = useState<Record<string, string>>({})
  const [savingCorrectionId, setSavingCorrectionId] = useState<string | null>(null)

  /** 新消息出现或教练开始思考时滚动至最新位置 */
  useEffect(() => {
    const transcriptElement = transcriptRef.current
    if (transcriptElement) {
      transcriptElement.scrollTop = transcriptElement.scrollHeight
    }
  }, [isThinking, messages])

  /** 一键收藏或取消收藏「更自然的表达」 */
  async function handleToggleBookmarkCorrection(message: ConversationMessage): Promise<void> {
    if (!message.correction || savingCorrectionId === message.id) {
      return
    }
    const existingId = bookmarkedCorrectionMap[message.id]
    setSavingCorrectionId(message.id)
    try {
      if (existingId) {
        await removeLearningItem(existingId)
        setBookmarkedCorrectionMap((prev) => {
          const next = { ...prev }
          delete next[message.id]
          return next
        })
        toast.success('已取消收藏该表达')
        return
      }
      const savedItem = await saveLearningItem({
        kind:
          getTextType(message.correction.suggestedText) === TextType.WORD ? 'word' : 'sentence',
        source: 'text',
        originalText: message.correction.suggestedText,
        translatedText: message.correction.explanation
      })
      setBookmarkedCorrectionMap((prev) => ({
        ...prev,
        [message.id]: savedItem.id
      }))
      toast.success('已收藏更自然的表达')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '收藏操作失败，请稍后重试')
    } finally {
      setSavingCorrectionId(null)
    }
  }

  if (messages.length === 0 && !isThinking) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-3 flex size-10 items-center justify-center rounded-xl border border-border bg-reading-surface text-foreground">
          <Sparkles size={18} />
        </div>
        <p className="text-sm font-medium text-foreground">对话会从一句轻松的问候开始</p>
        <p className="mt-1.5 max-w-sm text-xs leading-5 text-muted-foreground">
          可以在下方直接输入英文开聊，或点击「让教练先开口」。
        </p>
      </div>
    )
  }

  return (
    <div
      aria-label="当前对话记录"
      className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-6"
      ref={transcriptRef}
    >
      <div className="mx-auto w-full max-w-3xl space-y-5">
        {messages.map((message) => {
          const isUserMessage = message.role === 'user'
          const messageSpeechTarget = `${message.id}:message`
          const correctionSpeechTarget = `${message.id}:correction`
          const isCorrectionBookmarked = Boolean(bookmarkedCorrectionMap[message.id])
          const isSavingCorrection = savingCorrectionId === message.id
          const hasMultilineOrTranslation =
            Boolean(message.translation) || message.text.includes('\n') || message.text.length > 48

          return (
            <article className="lexicon-reveal flex flex-col gap-1.5" key={message.id}>
              <div
                className={cn(
                  'flex items-center text-xs font-medium text-muted-foreground',
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
                    'flex max-w-[85%] gap-2 rounded-xl px-4 py-2.5 text-left',
                    hasMultilineOrTranslation ? 'items-start' : 'items-center',
                    isUserMessage
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border/80 bg-reading-surface text-foreground'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'whitespace-pre-wrap break-words text-[15px] leading-6',
                        isUserMessage ? 'text-primary-foreground' : 'text-foreground'
                      )}
                    >
                      {message.text}
                    </p>
                    {message.translation && (
                      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                        {message.translation}
                      </p>
                    )}
                  </div>

                  <SpeechButton
                    canPlay={canPlaySpeech}
                    className={
                      isUserMessage
                        ? 'text-primary-foreground/75 hover:bg-primary-foreground/15 hover:text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }
                    label={isUserMessage ? '我的英文' : '教练英文'}
                    onToggle={onToggleSpeech}
                    speakingTarget={speakingTarget}
                    target={messageSpeechTarget}
                    text={message.text}
                  />
                </div>

                {message.correction && (
                  <div className="marginalia-card relative mt-2 max-w-[85%] py-3 pl-3.5 pr-3 text-left">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-marginalia-foreground">
                        <Sparkles size={13} />
                        <span>更自然的表达</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          aria-label={isCorrectionBookmarked ? '取消收藏该表达' : '收藏该表达'}
                          aria-pressed={isCorrectionBookmarked}
                          className={cn(
                            'h-7 cursor-pointer px-2 text-xs',
                            isCorrectionBookmarked && 'text-foreground'
                          )}
                          disabled={isSavingCorrection}
                          onClick={() => void handleToggleBookmarkCorrection(message)}
                          size="sm"
                          title={isCorrectionBookmarked ? '取消收藏' : '加入学习收藏'}
                          variant="ghost"
                        >
                          {isSavingCorrection ? (
                            <Loader2 className="animate-spin" size={13} />
                          ) : isCorrectionBookmarked ? (
                            <BookmarkCheck size={13} />
                          ) : (
                            <Bookmark size={13} />
                          )}
                          <span>{isCorrectionBookmarked ? '已收藏' : '收藏'}</span>
                        </Button>
                        <SpeechButton
                          canPlay={canPlaySpeech}
                          label="更自然的表达"
                          onToggle={onToggleSpeech}
                          speakingTarget={speakingTarget}
                          target={correctionSpeechTarget}
                          text={message.correction.suggestedText}
                        />
                      </div>
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
                  <div className="mt-1.5 flex items-center gap-1.5 pr-1 text-xs text-muted-foreground">
                    <Check size={13} className="text-emerald-600 dark:text-emerald-400" />
                    <span>表达自然，无需纠正</span>
                  </div>
                )}
              </div>
            </article>
          )
        })}

        {isThinking && (
          <article aria-live="polite" className="lexicon-reveal flex flex-col gap-1.5" role="status">
            <div className="flex items-center pl-1 text-xs font-medium text-muted-foreground">
              <span>教练</span>
            </div>
            <div className="flex items-start">
              <div className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-reading-surface px-4 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="animate-spin" size={14} />
                <span>教练正在组织回复…</span>
              </div>
            </div>
          </article>
        )}
      </div>
    </div>
  )
}
