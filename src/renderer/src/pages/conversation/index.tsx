import {
  AlertCircle,
  LoaderCircle,
  MessageCircleMore,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Square,
  Volume2
} from 'lucide-react'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'
import type { ConversationStatus } from '@src/type/conversation'
import ConversationTranscript from './ConversationTranscript'
import useConversation from './useConversation'

/** 对话状态展示配置 */
const STATUS_VIEW_MAP: Record<
  ConversationStatus,
  { label: string; description: string; icon: typeof Mic }
> = {
  idle: {
    label: '准备就绪',
    description: '开始后，AI 会先用英语向你问好',
    icon: MessageCircleMore
  },
  initializing: {
    label: '正在准备',
    description: '正在启动麦克风与本地英文识别',
    icon: LoaderCircle
  },
  listening: { label: '正在聆听', description: '直接说英语，停顿后会自动发送', icon: Mic },
  thinking: { label: '正在思考', description: '正在组织自然回复和表达建议', icon: LoaderCircle },
  speaking: { label: '正在朗读', description: '朗读结束后会自动恢复聆听', icon: Volume2 },
  paused: { label: '已暂停', description: '继续后会重新打开麦克风', icon: Pause },
  error: { label: '需要处理', description: '查看下方提示后重试', icon: AlertCircle }
}

// 监听状态的音量刻度
const VOICE_METER_BARS = [0.35, 0.58, 0.82, 1, 0.68, 0.46, 0.75, 0.52, 0.3]

/** 渲染实时英语口语实验台 */
export default function ConversationPage(): React.JSX.Element {
  // 实时对话状态与操作
  const {
    status,
    messages,
    liveTranscript,
    errorMessage,
    canRetryReply,
    startConversation,
    pauseConversation,
    resumeConversation,
    endConversation,
    retryReply
  } = useConversation()
  // 当前状态展示配置
  const statusView = STATUS_VIEW_MAP[status]
  // 当前状态图标
  const StatusIcon = statusView.icon
  // 是否存在本次会话记录
  const hasMessages = messages.length > 0
  // 是否处于运行中的会话
  const isActive = ['initializing', 'listening', 'thinking', 'speaking', 'paused'].includes(status)
  // 当前主显示文本
  const focalText =
    liveTranscript ||
    (status === 'listening'
      ? '正在聆听…'
      : status === 'thinking'
        ? '正在思考…'
        : status === 'speaking'
          ? messages.at(-1)?.text || '正在朗读…'
          : '随时可以开始')

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-6 py-8 lg:px-10 lg:py-10">
      <header className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h2 className="font-display text-4xl tracking-[-0.03em] text-foreground">英语口语对话</h2>
          <p className="mt-3 max-w-[62ch] text-sm leading-6 text-muted-foreground">
            免手动轮流对话。本地识别你的英语，AI 自然接话并在需要时给出表达建议。
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {status === 'paused' && (
            <Button className="cursor-pointer" onClick={resumeConversation} variant="secondary">
              <Play size={15} />
              继续
            </Button>
          )}
          {status === 'listening' && (
            <Button className="cursor-pointer" onClick={pauseConversation} variant="secondary">
              <Pause size={15} />
              暂停
            </Button>
          )}
          {isActive && (
            <Button className="cursor-pointer" onClick={endConversation} variant="outline">
              <Square size={14} />
              结束
            </Button>
          )}
          {!isActive && (
            <Button
              className="h-11 cursor-pointer rounded-xl px-5 shadow-[0_10px_24px_-16px_var(--action-shadow)] active:translate-y-px"
              onClick={startConversation}
            >
              {hasMessages ? <RotateCcw size={17} /> : <Mic size={17} />}
              {hasMessages ? '重新开始' : '开始对话'}
            </Button>
          )}
        </div>
      </header>

      <section className="mt-7 grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(300px,0.82fr)_minmax(360px,1.18fr)]">
        <div className="lab-panel flex flex-col overflow-hidden lg:sticky lg:top-8 lg:h-[calc(100vh-8rem)] lg:min-h-[34rem]">
          <div className="flex min-h-12 items-center justify-between gap-3 border-b border-border px-4">
            <span className="measurement-label">实时对话</span>
            <Badge className="gap-1.5" variant={status === 'error' ? 'destructive' : 'secondary'}>
              <StatusIcon
                className={cn(
                  (status === 'initializing' || status === 'thinking') && 'animate-spin'
                )}
                size={13}
              />
              {statusView.label}
            </Badge>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center px-6 py-6 text-center lg:py-10">
            {status === 'idle' ? (
              <button
                aria-label={hasMessages ? '重新开始英语口语对话' : '开始英语口语对话'}
                className="relative flex size-20 cursor-pointer items-center justify-center rounded-2xl border border-border bg-muted/45 text-primary transition-[background-color,border-color,transform] hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px lg:size-24"
                onClick={startConversation}
                title={hasMessages ? '重新开始' : '开始对话'}
                type="button"
              >
                <StatusIcon className="size-7 lg:size-8" strokeWidth={1.7} />
              </button>
            ) : (
              <div
                aria-hidden="true"
                className={cn(
                  'relative flex size-20 items-center justify-center rounded-2xl border border-border bg-muted/45 text-primary transition-[background-color,border-color,transform] lg:size-24',
                  status === 'listening' && 'border-primary/35 bg-accent'
                )}
              >
                {status === 'listening' ? (
                  <div className="flex h-11 items-center gap-1" aria-hidden="true">
                    {VOICE_METER_BARS.map((scale, index) => (
                      <span
                        className="w-1 rounded-sm bg-primary motion-safe:animate-pulse"
                        key={index}
                        style={{
                          height: `${Math.round(scale * 42)}px`,
                          animationDelay: `${index * 70}ms`
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <StatusIcon
                    className={cn(
                      'size-7 lg:size-8',
                      (status === 'initializing' || status === 'thinking') && 'animate-spin'
                    )}
                    strokeWidth={1.7}
                  />
                )}
              </div>
            )}

            <p
              aria-live="polite"
              className="mt-5 max-w-md text-balance text-lg font-medium leading-7 tracking-[-0.01em] text-foreground lg:mt-7 lg:text-xl lg:leading-8"
            >
              {focalText}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground lg:mt-3">
              {statusView.description}
            </p>

            {errorMessage && (
              <div className="mt-6 w-full rounded-lg bg-destructive/10 px-4 py-3 text-left text-sm leading-6 text-destructive">
                <p>{errorMessage}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {canRetryReply && (
                    <Button
                      className="cursor-pointer"
                      onClick={retryReply}
                      size="sm"
                      variant="outline"
                    >
                      重试回复
                    </Button>
                  )}
                  <Button
                    className="cursor-pointer"
                    onClick={startConversation}
                    size="sm"
                    variant="ghost"
                  >
                    重新开始
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border px-4 py-2.5 text-xs leading-5 text-muted-foreground lg:py-3">
            AI 朗读时会暂停收音，避免扬声器声音被再次识别。
          </div>
        </div>

        <div className="lab-panel flex min-h-[34rem] flex-col overflow-hidden lg:h-[calc(100vh-8rem)]">
          <div className="flex h-12 items-center justify-between border-b border-border px-4">
            <span className="measurement-label">对话记录</span>
            <span className="text-xs text-muted-foreground">{messages.length} 条消息</span>
          </div>
          <ConversationTranscript messages={messages} />
        </div>
      </section>
    </div>
  )
}
