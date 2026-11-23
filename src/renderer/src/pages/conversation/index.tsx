import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  AlertCircle,
  Download,
  Keyboard,
  LoaderCircle,
  MessageCircleMore,
  Mic,
  Pause,
  Play,
  RotateCcw,
  SendHorizontal,
  Settings2,
  Square,
  Trash2,
  X
} from 'lucide-react'
import SpeakingIndicator from '@renderer/components/SpeakingIndicator'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Progress } from '@renderer/components/ui/progress'
import { Switch } from '@renderer/components/ui/switch'
import { Textarea } from '@renderer/components/ui/textarea'
import { cn } from '@renderer/lib/utils'
import type { ConversationInputMode, ConversationStatus } from '@src/type/conversation'
import { formatModelBytes } from '@src/utils/local-models'
import ConversationTranscript from './components/ConversationTranscript'
import useConversation from './useConversation'

/** 对话状态展示配置 */
const STATUS_VIEW_MAP: Record<
  ConversationStatus,
  { label: string; description: string; icon: typeof Mic }
> = {
  idle: {
    label: '准备就绪',
    description: '点击开始让 AI 主动问好，或在文字模式下直接输入开聊',
    icon: MessageCircleMore
  },
  initializing: {
    label: '正在准备',
    description: '正在启动麦克风与本地英文识别',
    icon: LoaderCircle
  },
  listening: { label: '正在聆听', description: '直接说英语，停顿后会自动发送', icon: Mic },
  recognizing: {
    label: '正在识别',
    description: '正在整理你刚才说的英语',
    icon: LoaderCircle
  },
  'awaiting-input': {
    label: '等待输入',
    description: '输入英文后发送，AI 会自然接话',
    icon: Keyboard
  },
  thinking: { label: '正在思考', description: '正在组织自然回复和表达建议', icon: LoaderCircle },
  speaking: { label: '正在朗读', description: '朗读结束后会恢复之前的对话状态', icon: MessageCircleMore },
  paused: { label: '已暂停', description: '点击继续后恢复当前练习', icon: Pause },
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
  recognizing: '正在识别…',
  thinking: '正在思考…',
  paused: '语音练习已暂停，点击继续恢复',
  error: '暂时无法继续'
}

/** 文字工作区的状态主文案 */
const TEXT_FOCAL_TEXT_MAP: Record<ConversationStatus, string> = {
  idle: '直接输入英文开聊，或点击「让教练先开口」…',
  initializing: '正在准备…',
  listening: '等待输入',
  recognizing: '正在识别…',
  'awaiting-input': '轮到你了，输入英文回复…',
  thinking: '正在组织回复…',
  speaking: '正在朗读…',
  paused: '对话已暂停，点击输入框继续…',
  error: '暂时无法继续'
}

/**
 * 渲染英语语音与文字对话工作台
 * @returns 对话页面节点
 */
export default function ConversationPage(): React.JSX.Element {
  const location = useLocation()
  const {
    status,
    inputMode,
    isTextReplySpeechEnabled,
    messages,
    manualSpeechTarget,
    errorMessage,
    whisperModelState,
    isWhisperModelLoading,
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
    clearConversation,
    retryReply,
    downloadWhisperModel,
    cancelWhisperDownload,
    openLocalModelSettings
  } = useConversation()
  const [draftText, setDraftText] = useState('')
  const textInputRef = useRef<HTMLTextAreaElement | null>(null)
  const statusView = STATUS_VIEW_MAP[status]
  const StatusIcon = statusView.icon
  const hasMessages = messages.length > 0
  const canTypeMessage =
    inputMode === 'text' && (status === 'awaiting-input' || status === 'idle')
  const canSendText = canTypeMessage && Boolean(draftText.trim())
  const isTextConversationPaused = inputMode === 'text' && status === 'paused'
  const showActiveStatusBadge = status !== 'idle' && status !== 'awaiting-input'
  const voiceFocalText =
    manualSpeechTarget
      ? '正在播放所选英文…'
      : status === 'speaking'
        ? messages.at(-1)?.text || '正在朗读…'
        : VOICE_FOCAL_TEXT_MAP[status] || '随时可以开始'

  /** 若由翻译台或学习收藏带入练习文本，则自动切入文字输入草稿 */
  useEffect(() => {
    const state = location.state as { practiceText?: string } | null
    const practiceText = state?.practiceText?.trim()
    if (!practiceText) {
      return
    }
    if (!isConversationActive && inputMode !== 'text') {
      changeInputMode('text')
    }
    setDraftText(practiceText)
    window.history.replaceState({}, '')
  }, [changeInputMode, inputMode, isConversationActive, location.state])

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

  /** 结束当前对话并保留记录 */
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

  /** 聚焦暂停中的文字输入框时继续对话 */
  const handleTextInputFocus = (): void => {
    if (isTextConversationPaused) {
      resumeConversation()
    }
  }

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
  const voiceAction = voiceActionMap[status]
  const VoiceActionIcon = voiceAction?.icon
  const showWhisperSetupPrompt =
    inputMode === 'voice' &&
    !isConversationActive &&
    !isWhisperModelLoading &&
    whisperModelState.status !== 'installed'
  const isWhisperBusy =
    whisperModelState.status === 'downloading' || whisperModelState.status === 'extracting'

  /** 文字输入进入 awaiting-input 后自动定位焦点 */
  useEffect(() => {
    if (inputMode === 'text' && status === 'awaiting-input') {
      textInputRef.current?.focus({ preventScroll: true })
    }
  }, [inputMode, status])

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[1200px] flex-col overflow-hidden px-5 py-4 lg:px-7 lg:py-5">
      <h1 className="sr-only">对话练习</h1>

      <section className="lexicon-sheet flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-11 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/55 px-5 py-1.5">
          <div
            aria-label="练习方式"
            className="flex items-center gap-0.5 rounded-md bg-muted/70 p-0.5"
            role="group"
          >
            {(Object.entries(INPUT_MODE_VIEW_MAP) as [
              ConversationInputMode,
              (typeof INPUT_MODE_VIEW_MAP)[ConversationInputMode]
            ][]).map(([mode, modeView]) => {
              const isSelected = inputMode === mode
              const ModeIcon = modeView.icon
              return (
                <button
                  aria-disabled={isConversationActive}
                  aria-pressed={isSelected}
                  className={cn(
                    'flex h-7 cursor-pointer items-center gap-1.5 rounded-sm px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45',
                    isSelected
                      ? 'bg-card text-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground',
                    isConversationActive && !isSelected && 'opacity-50'
                  )}
                  key={mode}
                  onClick={() => handleInputModeChange(mode)}
                  title={isConversationActive ? '请先结束当前对话，再切换练习方式' : undefined}
                  type="button"
                >
                  <ModeIcon size={13} />
                  {modeView.label}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            {showActiveStatusBadge && (
              <Badge
                aria-live="polite"
                className="gap-1.5"
                role="status"
                variant={status === 'error' ? 'destructive' : 'secondary'}
              >
                {status === 'speaking' ? (
                  <SpeakingIndicator isSpeaking />
                ) : (
                  <StatusIcon
                    className={cn(
                      (status === 'initializing' ||
                        status === 'recognizing' ||
                        status === 'thinking') &&
                        'animate-spin'
                    )}
                    size={12}
                  />
                )}
                {statusView.label}
              </Badge>
            )}
            {hasMessages && !isConversationActive && (
              <Button
                className="h-7 cursor-pointer px-2 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => {
                  setDraftText('')
                  clearConversation()
                }}
                size="sm"
                variant="ghost"
              >
                <Trash2 size={13} />
                清空
              </Button>
            )}
            {isConversationActive && (
              <Button
                className="h-7 cursor-pointer px-2.5 text-xs"
                onClick={handleEndConversation}
                size="sm"
                variant="outline"
              >
                <Square size={12} />
                结束本轮
              </Button>
            )}
          </div>
        </div>

        <ConversationTranscript
          canPlaySpeech={canPlayMessageSpeech}
          isThinking={status === 'thinking'}
          messages={messages}
          onToggleSpeech={toggleManualSpeech}
          speakingTarget={manualSpeechTarget}
        />

        <div className="shrink-0 px-5 pb-4 pt-1">
          <div className="mx-auto w-full max-w-3xl">
            {inputMode === 'voice' ? (
              showWhisperSetupPrompt ? (
                <div className="space-y-3 rounded-xl border border-border bg-reading-surface px-4 py-3 shadow-2xs">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        aria-hidden="true"
                        className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground"
                      >
                        {isWhisperBusy ? (
                          <LoaderCircle className="animate-spin" size={18} />
                        ) : (
                          <Download size={18} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {whisperModelState.status === 'extracting'
                            ? '正在解压并校验英文识别模型…'
                            : whisperModelState.status === 'downloading'
                              ? '正在下载 Whisper 英文识别模型…'
                              : '语音练习需要下载 Whisper 英文识别模型（约 154 MB）'}
                        </p>
                        <p className="truncate text-xs leading-5 text-muted-foreground">
                          配合内置 Silero VAD 在本地识别英语发音，下载后即可直接开口练习。
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {isWhisperBusy ? (
                        <Button
                          className="cursor-pointer"
                          onClick={cancelWhisperDownload}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <X size={14} />
                          取消下载
                        </Button>
                      ) : (
                        <Button
                          className="cursor-pointer"
                          onClick={downloadWhisperModel}
                          size="sm"
                          type="button"
                        >
                          <Download size={14} />
                          {whisperModelState.status === 'error'
                            ? '重试下载'
                            : '下载模型（约 154 MB）'}
                        </Button>
                      )}
                      <Button
                        className="cursor-pointer"
                        onClick={openLocalModelSettings}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <Settings2 size={14} />
                        下载源设置
                      </Button>
                      <Button
                        className="cursor-pointer"
                        onClick={() => handleInputModeChange('text')}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        改用文字练习
                      </Button>
                    </div>
                  </div>
                  {isWhisperBusy && (
                    <div className="space-y-1.5">
                      <Progress value={whisperModelState.progress} />
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {whisperModelState.status === 'extracting'
                          ? '正在解压并校验文件…'
                          : whisperModelState.totalBytes > 0
                            ? `${formatModelBytes(whisperModelState.downloadedBytes)} / ${formatModelBytes(whisperModelState.totalBytes)}（${whisperModelState.progress}%）`
                            : `已下载 ${formatModelBytes(whisperModelState.downloadedBytes)}…`}
                      </p>
                    </div>
                  )}
                  {whisperModelState.status === 'error' && whisperModelState.error && (
                    <p className="text-xs text-destructive" role="alert">
                      {whisperModelState.error}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-reading-surface px-4 py-3 shadow-2xs">
                  <div
                    aria-hidden="true"
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground',
                      (status === 'listening' || status === 'recognizing') &&
                        'border-ring/45 text-foreground'
                    )}
                  >
                    <StatusIcon
                      className={cn(
                        (status === 'initializing' ||
                          status === 'recognizing' ||
                          status === 'thinking') &&
                          'animate-spin'
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
              )
            ) : (
              <div className="rounded-xl border border-border bg-card shadow-2xs transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/25">
                <Textarea
                  aria-describedby="text-conversation-shortcuts"
                  aria-label="英文对话输入"
                  className="custom-scrollbar min-h-16 max-h-36 resize-none rounded-none border-0 bg-transparent px-4 pb-2 pt-3 leading-6 focus-visible:ring-0"
                  disabled={!canTypeMessage && !isTextConversationPaused}
                  onChange={(event) => setDraftText(event.target.value)}
                  onFocus={handleTextInputFocus}
                  onKeyDown={handleTextKeyDown}
                  placeholder={TEXT_FOCAL_TEXT_MAP[status]}
                  readOnly={isTextConversationPaused}
                  ref={textInputRef}
                  value={draftText}
                />
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-2.5 pt-1 text-xs text-muted-foreground">
                  <p className="min-w-0 pl-1" id="text-conversation-shortcuts">
                    Enter 发送 · Shift+Enter 换行
                  </p>
                  <div className="flex shrink-0 flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-1.5">
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
                    {!isConversationActive && (
                      <Button
                        className="h-7.5 cursor-pointer px-2.5 text-xs"
                        onClick={handleStartConversation}
                        size="sm"
                        variant="ghost"
                      >
                        <RotateCcw size={13} />
                        {hasMessages ? '新对话' : '让教练先开口'}
                      </Button>
                    )}
                    <Button
                      className="h-7.5 cursor-pointer px-3 text-xs"
                      disabled={!canSendText}
                      onClick={handleTextSubmit}
                      size="sm"
                      type="button"
                      variant={canSendText ? 'default' : 'outline'}
                    >
                      <SendHorizontal size={13} />
                      发送
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
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
        </div>
      </section>
    </div>
  )
}
