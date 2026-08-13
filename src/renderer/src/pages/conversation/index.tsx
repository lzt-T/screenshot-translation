import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Keyboard,
  LoaderCircle,
  MessageCircleMore,
  Mic,
  Pause,
  Play,
  RotateCcw,
  SendHorizontal,
  Square,
  Volume2
} from 'lucide-react'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Switch } from '@renderer/components/ui/switch'
import { Textarea } from '@renderer/components/ui/textarea'
import { cn } from '@renderer/lib/utils'
import type { ConversationInputMode, ConversationStatus } from '@src/type/conversation'
import ConversationTranscript from './components/ConversationTranscript'
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
  'awaiting-input': {
    label: '等待输入',
    description: '输入英文后发送，AI 会自然接话',
    icon: Keyboard
  },
  thinking: { label: '正在思考', description: '正在组织自然回复和表达建议', icon: LoaderCircle },
  speaking: { label: '正在朗读', description: '朗读结束后会恢复之前的对话状态', icon: Volume2 },
  paused: { label: '已暂停', description: '继续后会重新打开麦克风', icon: Pause },
  error: { label: '需要处理', description: '查看下方提示后重试', icon: AlertCircle }
}

/** 输入模式展示配置 */
const INPUT_MODE_VIEW_MAP: Record<
  ConversationInputMode,
  { label: string; icon: typeof Mic }
> = {
  voice: { label: '语音练习', icon: Mic },
  text: { label: '文字练习', icon: Keyboard }
}

/** 语音工作区的固定状态主文案 */
const VOICE_FOCAL_TEXT_MAP: Partial<Record<ConversationStatus, string>> = {
  idle: '随时可以开始',
  initializing: '正在准备…',
  listening: '正在聆听…',
  thinking: '正在思考…',
  paused: '对话已暂停',
  error: '暂时无法继续'
}

/** 文字工作区的状态主文案 */
const TEXT_FOCAL_TEXT_MAP: Record<ConversationStatus, string> = {
  idle: '准备好后开始',
  initializing: '正在准备…',
  listening: '等待输入',
  'awaiting-input': '轮到你了',
  thinking: '正在组织回复…',
  speaking: '正在朗读…',
  paused: '对话已暂停',
  error: '暂时无法继续'
}

/** 渲染英语语音与文字对话工作台 */
export default function ConversationPage(): React.JSX.Element {
  // 对话状态与操作
  const {
    status,
    inputMode,
    isTextReplySpeechEnabled,
    messages,
    manualSpeechTarget,
    liveTranscript,
    errorMessage,
    isConversationActive,
    canRetryReply,
    canPlayMessageSpeech,
    changeInputMode,
    changeTextReplySpeech,
    toggleManualSpeech,
    startConversation,
    submitTextMessage,
    pauseConversation,
    resumeConversation,
    endConversation,
    retryReply
  } = useConversation()
  // 文字模式的当前输入草稿
  const [draftText, setDraftText] = useState('')
  // 文字对话输入框
  const textInputRef = useRef<HTMLTextAreaElement | null>(null)
  // 当前状态展示配置
  const statusView = STATUS_VIEW_MAP[status]
  // 当前状态图标
  const StatusIcon = statusView.icon
  // 是否存在本次会话记录
  const hasMessages = messages.length > 0
  // 文字输入区是否可以接收新消息
  const canTypeMessage = inputMode === 'text' && status === 'awaiting-input'
  // 当前草稿是否可以发送
  const canSendText = canTypeMessage && Boolean(draftText.trim())
  // 语音工作区的当前主显示文本
  const voiceFocalText =
    manualSpeechTarget
      ? '正在播放所选英文…'
      : liveTranscript ||
        (status === 'speaking'
          ? messages.at(-1)?.text || '正在朗读…'
          : VOICE_FOCAL_TEXT_MAP[status] || '随时可以开始')
  /** 切换当前对话输入模式 */
  const handleInputModeChange = (nextInputMode: ConversationInputMode): void => {
    if (changeInputMode(nextInputMode)) {
      setDraftText('')
    }
  }

  /** 开始新对话并清理文字草稿 */
  const handleStartConversation = (): void => {
    setDraftText('')
    startConversation()
  }

  /** 结束当前对话并清理文字草稿 */
  const handleEndConversation = (): void => {
    setDraftText('')
    endConversation()
  }

  /** 提交当前文字草稿 */
  const handleTextSubmit = (): void => {
    if (submitTextMessage(draftText)) {
      setDraftText('')
    }
  }

  /** 处理文字输入区的发送与换行快捷键 */
  const handleTextKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
      return
    }
    event.preventDefault()
    handleTextSubmit()
  }
  // 语音模式主操作配置
  const voiceActionMap: Partial<
    Record<ConversationStatus, { label: string; icon: typeof Mic; action: () => void }>
  > = {
    idle: {
      label: hasMessages ? '重新开始' : '开始练习',
      icon: hasMessages ? RotateCcw : Mic,
      action: handleStartConversation
    },
    listening: { label: '暂停', icon: Pause, action: pauseConversation },
    paused: { label: '继续', icon: Play, action: resumeConversation }
  }
  // 当前语音模式主操作
  const voiceAction = voiceActionMap[status]
  // 当前语音模式主操作图标
  const VoiceActionIcon = voiceAction?.icon

  /** 文字输入恢复可用后自动定位输入焦点 */
  useEffect(() => {
    if (canTypeMessage) {
      textInputRef.current?.focus({ preventScroll: true })
    }
  }, [canTypeMessage])

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[1180px] flex-col overflow-hidden px-5 py-5 lg:px-7 lg:py-6">
      <header className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-foreground">英语对话练习</h2>
          <p className="mt-1 max-w-[62ch] text-sm leading-6 text-muted-foreground">
            选择直接开口或文字输入，AI 会自然接话并在需要时给出表达建议。
          </p>
        </div>

        {isConversationActive && (
          <Button className="cursor-pointer" onClick={handleEndConversation} variant="outline">
            <Square size={14} />
            结束
          </Button>
        )}
      </header>

      <section className="lab-panel mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-12 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
          <div
            aria-label="练习方式"
            className="flex items-center gap-1"
            role="group"
          >
            {(Object.entries(INPUT_MODE_VIEW_MAP) as [
              ConversationInputMode,
              (typeof INPUT_MODE_VIEW_MAP)[ConversationInputMode]
            ][]).map(
              ([mode, modeView]) => {
                // 当前模式选项是否已选中
                const isSelected = inputMode === mode
                // 当前模式图标
                const ModeIcon = modeView.icon
                return (
                  <Button
                    aria-disabled={isConversationActive}
                    aria-pressed={isSelected}
                    className={cn(
                      'h-8 cursor-pointer px-3 text-xs',
                      isSelected && 'bg-primary/10 text-primary hover:bg-primary/12',
                      isConversationActive && !isSelected && 'opacity-55'
                    )}
                    key={mode}
                    onClick={() => handleInputModeChange(mode)}
                    title={isConversationActive ? '请先结束当前对话，再切换练习方式' : undefined}
                    type="button"
                    variant="ghost"
                  >
                    <ModeIcon size={14} />
                    {modeView.label}
                  </Button>
                )
              }
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {messages.length} 条消息
            </span>
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
        </div>

        <ConversationTranscript
          canPlaySpeech={canPlayMessageSpeech}
          messages={messages}
          onToggleSpeech={toggleManualSpeech}
          speakingTarget={manualSpeechTarget}
        />

        <div className="shrink-0 border-t border-border bg-card px-4 py-3 sm:px-5">
          {inputMode === 'voice' ? (
            <div className="flex items-center gap-3">
              <div
                aria-hidden="true"
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/45 text-muted-foreground',
                  status === 'listening' && 'border-primary/30 bg-primary/8 text-primary'
                )}
              >
                <StatusIcon
                  className={cn(
                    (status === 'initializing' || status === 'thinking') && 'animate-spin'
                  )}
                  size={18}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p aria-live="polite" className="truncate text-sm font-medium text-foreground">
                  {voiceFocalText}
                </p>
                <p className="truncate text-xs leading-5 text-muted-foreground">
                  {statusView.description}
                </p>
              </div>
              {voiceAction && (
                <Button className="shrink-0 cursor-pointer" onClick={voiceAction.action}>
                  {VoiceActionIcon && <VoiceActionIcon size={15} />}
                  {voiceAction.label}
                </Button>
              )}
              {!voiceAction && status !== 'error' && (
                <Button className="shrink-0" disabled>
                  <StatusIcon size={15} />
                  {statusView.label}
                </Button>
              )}
            </div>
          ) : (
            <div>
              <Textarea
                aria-describedby="text-conversation-shortcuts"
                aria-label="英文对话输入"
                className="min-h-20 resize-none bg-background leading-6"
                disabled={!canTypeMessage}
                onChange={(event) => setDraftText(event.target.value)}
                onKeyDown={handleTextKeyDown}
                placeholder={canTypeMessage ? '输入你的英文回复…' : TEXT_FOCAL_TEXT_MAP[status]}
                ref={textInputRef}
                value={draftText}
              />
              <div className="mt-2 flex items-center justify-between gap-4 text-xs leading-5 text-muted-foreground">
                <p className="min-w-0" id="text-conversation-shortcuts">
                  Enter 发送 · Shift + Enter 换行
                </p>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer" htmlFor="text-reply-speech">
                      朗读 AI 回复
                    </label>
                    <Switch
                      aria-label="朗读 AI 回复"
                      checked={isTextReplySpeechEnabled}
                      className="cursor-pointer"
                      id="text-reply-speech"
                      onCheckedChange={changeTextReplySpeech}
                    />
                  </div>
                  {!isConversationActive ? (
                    <Button className="cursor-pointer" onClick={handleStartConversation}>
                      {hasMessages ? <RotateCcw size={15} /> : <Keyboard size={15} />}
                      {hasMessages ? '重新开始' : '开始练习'}
                    </Button>
                  ) : (
                    <Button
                      className="cursor-pointer"
                      disabled={!canSendText}
                      onClick={handleTextSubmit}
                      type="button"
                    >
                      <SendHorizontal size={15} />
                      发送
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <p className="mr-auto">{errorMessage}</p>
              {canRetryReply && (
                <Button className="cursor-pointer" onClick={retryReply} size="sm" variant="outline">
                  重试回复
                </Button>
              )}
              <Button
                className="cursor-pointer"
                onClick={handleStartConversation}
                size="sm"
                variant="ghost"
              >
                重新开始
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
