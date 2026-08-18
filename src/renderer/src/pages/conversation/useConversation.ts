import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import localForage from 'localforage'
import { toast } from 'sonner'
import useLocalForage from '@renderer/hooks/useLocalForage'
import type {
  ConversationCoachResponse,
  ConversationHistoryItem,
  ConversationInputMode,
  ConversationMessage,
  ConversationOpeningInspirationKey,
  ConversationOpeningRecord,
  ConversationRequest,
  ConversationStatus,
  RecognitionWorkerResponse
} from '@src/type/conversation'
import { SendEnum } from '@src/type/ipc-constants'
import {
  CONVERSATION_OPENING_INSPIRATION_MAP,
  isRepeatedConversationOpening,
  MAX_RECENT_OPENING_COUNT,
  parseConversationOpeningRecords,
  RECENT_CONVERSATION_OPENINGS_STORAGE_KEY,
  selectConversationOpeningInspiration
} from '@src/utils/conversation-opening'
import { speakText, stopSpeaking } from '@src/utils/speak'
import { MicrophoneCapture } from './audio/microphone-capture'

/** 等待重试的模型请求 */
interface FailedConversationRequest {
  /** 是否为开场请求 */
  isOpening: boolean
  /** 当前开场使用的灵感键 */
  openingInspirationKey?: ConversationOpeningInspirationKey
  /** 当前请求参考的近期成功开场 */
  recentOpeningRecords?: ConversationOpeningRecord[]
  /** 当前重试必须避开的冲突开场 */
  conflictingOpening?: string
  /** 是否已经执行过开场去重重试 */
  hasOpeningDeduplicationRetried?: boolean
  /** 当前用户表达 */
  userText?: string
}

// 会话运行期间禁止切换输入模式的状态
const ACTIVE_CONVERSATION_STATUSES = new Set<ConversationStatus>([
  'initializing',
  'listening',
  'recognizing',
  'awaiting-input',
  'thinking',
  'speaking',
  'paused'
])

// 允许手动朗读历史英文的稳定状态
const MANUAL_SPEECH_STATUSES = new Set<ConversationStatus>([
  'idle',
  'listening',
  'awaiting-input',
  'paused',
  'error'
])

/** 将识别模型输出整理为适合界面展示的英文文本 */
function formatRecognizedEnglish(text: string): string {
  return text.trim().replace(/\s+/gu, ' ')
}

/**
 * 将页面请求信息转换为主进程口语教练请求
 * @param requestInfo 当前页面请求信息
 * @param history 最近的对话上下文
 * @returns 主进程使用的结构化请求
 */
function createConversationRequest(
  requestInfo: FailedConversationRequest,
  history: ConversationHistoryItem[]
): ConversationRequest {
  // 当前开场使用的灵感指导
  const openingInspiration = requestInfo.openingInspirationKey
    ? CONVERSATION_OPENING_INSPIRATION_MAP[requestInfo.openingInspirationKey]
    : undefined
  // 需要提供给模型避让的近期开场文本
  const recentOpenings = requestInfo.recentOpeningRecords?.map((record) => record.text)
  return {
    isOpening: requestInfo.isOpening,
    openingInspiration,
    recentOpenings,
    conflictingOpening: requestInfo.conflictingOpening,
    history,
    userText: requestInfo.userText
  }
}

/**
 * 调用主进程生成单次口语教练回复
 * @param request 结构化口语教练请求
 * @returns AI 口语教练响应
 */
async function invokeConversationCoach(
  request: ConversationRequest
): Promise<ConversationCoachResponse> {
  return (await window.electron.ipcRenderer.invoke(
    SendEnum.CONVERSATION_REPLY,
    request
  )) as ConversationCoachResponse
}

/** 管理英语语音与打字对话流程 */
export default function useConversation() {
  // 页面路由方法
  const navigate = useNavigate()
  // 当前模型设置
  const { isInit, storeSetting } = useLocalForage()
  // 当前对话状态
  const [status, setStatus] = useState<ConversationStatus>('idle')
  // 当前对话输入模式
  const [inputMode, setInputMode] = useState<ConversationInputMode>('voice')
  // 文字模式是否朗读 AI 回复
  const [isTextReplySpeechEnabled, setIsTextReplySpeechEnabled] = useState(false)
  // 页面内对话消息
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  // 当前可展示错误
  const [errorMessage, setErrorMessage] = useState('')
  // 当前手动朗读目标
  const [manualSpeechTarget, setManualSpeechTarget] = useState<string | null>(null)
  // 最新对话状态引用
  const statusRef = useRef<ConversationStatus>('idle')
  // 最新文字回复朗读偏好
  const isTextReplySpeechEnabledRef = useRef(false)
  // 最新消息引用
  const messagesRef = useRef<ConversationMessage[]>([])
  // 当前会话编号
  const sessionIdRef = useRef(0)
  // 麦克风采集器
  const microphoneCaptureRef = useRef<MicrophoneCapture | null>(null)
  // 等待重试的请求
  const failedRequestRef = useRef<FailedConversationRequest | null>(null)
  // 已读取的近期成功开场记录
  const recentOpeningRecordsRef = useRef<ConversationOpeningRecord[] | null>(null)
  // 手动朗读开始前的页面状态
  const manualSpeechRestoreStatusRef = useRef<ConversationStatus | null>(null)
  // 最新手动朗读请求编号
  const manualSpeechRequestIdRef = useRef(0)

  statusRef.current = status
  messagesRef.current = messages

  if (!microphoneCaptureRef.current) {
    microphoneCaptureRef.current = new MicrophoneCapture()
  }

  /** 更新状态及其同步引用 */
  const updateStatus = useCallback((nextStatus: ConversationStatus): void => {
    statusRef.current = nextStatus
    setStatus(nextStatus)
  }, [])

  /** 停止麦克风和识别流 */
  const stopListening = useCallback((): void => {
    microphoneCaptureRef.current?.stop()
    window.electron.ipcRenderer.send(SendEnum.RECOGNITION_STOP)
  }, [])

  /** 切换空闲会话的输入模式 */
  const changeInputMode = useCallback(
    (nextInputMode: ConversationInputMode): boolean => {
      if (nextInputMode === inputMode) {
        return true
      }
      if (ACTIVE_CONVERSATION_STATUSES.has(statusRef.current)) {
        toast.info('请先结束当前对话，再切换练习方式')
        return false
      }

      failedRequestRef.current = null
      setErrorMessage('')
      updateStatus('idle')
      setInputMode(nextInputMode)
      return true
    },
    [inputMode, updateStatus]
  )

  /** 切换文字模式的 AI 回复朗读偏好 */
  const changeTextReplySpeech = (isEnabled: boolean): void => {
    isTextReplySpeechEnabledRef.current = isEnabled
    setIsTextReplySpeechEnabled(isEnabled)
  }

  /** 检查当前 AI 模型是否可用于对话 */
  const ensureModelReady = useCallback((): boolean => {
    if (isInit) {
      toast.error('配置加载中，请稍后重试')
      return false
    }
    // 当前激活的模型配置
    const activeModel = storeSetting.models.find((model) => model.id === storeSetting.activeModelId)
    if (!activeModel || (!activeModel.isBuiltInFree && !activeModel.apiKey.trim())) {
      toast.error('请先完成当前 AI 模型配置', {
        action: {
          label: '去设置',
          onClick: () => navigate('/setting?focus=model-config')
        }
      })
      return false
    }
    return true
  }, [isInit, navigate, storeSetting.activeModelId, storeSetting.models])

  /**
   * 将消息写入页面和同步引用
   * @param nextMessages 最新消息或更新函数
   * @returns 无返回值
   */
  const updateMessages = useCallback(
    (
      nextMessages:
        | ConversationMessage[]
        | ((previousMessages: ConversationMessage[]) => ConversationMessage[])
    ): void => {
      setMessages((previousMessages) => {
        // 计算后的最新消息
        const resolvedMessages =
          typeof nextMessages === 'function' ? nextMessages(previousMessages) : nextMessages
        messagesRef.current = resolvedMessages
        return resolvedMessages
      })
    },
    []
  )

  /** 读取并缓存近期成功开场记录 */
  const getRecentOpeningRecords = useCallback(async (): Promise<ConversationOpeningRecord[]> => {
    if (recentOpeningRecordsRef.current) {
      return recentOpeningRecordsRef.current
    }

    try {
      // 本地存储中的原始开场记录
      const storedRecords = await localForage.getItem(
        RECENT_CONVERSATION_OPENINGS_STORAGE_KEY
      )
      // 清理后的有效近期记录
      const recentRecords = parseConversationOpeningRecords(storedRecords)
      recentOpeningRecordsRef.current = recentRecords
      return recentRecords
    } catch {
      recentOpeningRecordsRef.current = []
      return []
    }
  }, [])

  /** 将最终采用的开场追加到本地近期记录 */
  const saveConversationOpeningRecord = useCallback((record: ConversationOpeningRecord): void => {
    // 追加后按上限截取的近期记录
    const recentRecords = [...(recentOpeningRecordsRef.current ?? []), record].slice(
      -MAX_RECENT_OPENING_COUNT
    )
    recentOpeningRecordsRef.current = recentRecords
    void localForage
      .setItem(RECENT_CONVERSATION_OPENINGS_STORAGE_KEY, recentRecords)
      .catch(() => undefined)
  }, [])

  /**
   * 启动一轮麦克风监听
   * @param sessionId 目标会话编号
   * @returns 启动完成任务
   */
  const startListening = useCallback(
    async (sessionId: number): Promise<void> => {
      if (sessionId !== sessionIdRef.current || statusRef.current === 'paused') {
        return
      }
      updateStatus('initializing')
      setErrorMessage('')

      try {
        await microphoneCaptureRef.current?.start((samples, sampleRate) => {
          if (sessionId !== sessionIdRef.current) {
            return
          }
          window.electron.ipcRenderer.send(SendEnum.RECOGNITION_AUDIO, samples, sampleRate)
        })
        if (sessionId !== sessionIdRef.current) {
          microphoneCaptureRef.current?.stop()
          return
        }
        window.electron.ipcRenderer.send(SendEnum.RECOGNITION_START)
      } catch (error) {
        // 麦克风启动错误信息
        const message =
          error instanceof DOMException && error.name === 'NotAllowedError'
            ? '无法使用麦克风，请在系统设置中允许 Bai_Ze 访问麦克风。'
            : error instanceof Error
              ? error.message
              : '麦克风启动失败，请检查输入设备。'
        updateStatus('error')
        setErrorMessage(message)
      }
    },
    [updateStatus]
  )

  /** 恢复手动朗读前的页面状态 */
  function restoreManualSpeechStatus(): void {
    // 需要恢复的页面状态
    const restoreStatus = manualSpeechRestoreStatusRef.current
    manualSpeechRestoreStatusRef.current = null
    setManualSpeechTarget(null)
    if (restoreStatus === 'listening') {
      void startListening(sessionIdRef.current)
      return
    }
    if (restoreStatus) {
      updateStatus(restoreStatus)
    }
  }

  /**
   * 切换指定历史英文的手动朗读
   * @param target 朗读目标标识
   * @param text 待朗读英文
   * @returns 无返回值
   */
  function toggleManualSpeech(target: string, text: string): void {
    if (manualSpeechTarget === target) {
      manualSpeechRequestIdRef.current += 1
      stopSpeaking()
      restoreManualSpeechStatus()
      return
    }
    if (!text.trim() || (!manualSpeechTarget && !MANUAL_SPEECH_STATUSES.has(statusRef.current))) {
      return
    }

    // 当前手动朗读请求编号
    const requestId = manualSpeechRequestIdRef.current + 1
    manualSpeechRequestIdRef.current = requestId
    if (!manualSpeechTarget) {
      manualSpeechRestoreStatusRef.current = statusRef.current
      if (statusRef.current === 'listening') {
        stopListening()
      }
    }
    setManualSpeechTarget(target)
    updateStatus('speaking')
    void speakText(
      text,
      /** 朗读完成后恢复原状态 */
      () => {
        if (requestId === manualSpeechRequestIdRef.current) {
          restoreManualSpeechStatus()
        }
      },
      /** 朗读失败后提示并恢复原状态 */
      (error) => {
        if (requestId !== manualSpeechRequestIdRef.current) {
          return
        }
        toast.error(error.message)
        restoreManualSpeechStatus()
      }
    )
  }

  /**
   * 朗读 AI 回复并恢复监听
   * @param text 英文回复
   * @param sessionId 目标会话编号
   * @returns 无返回值
   */
  const speakReply = useCallback(
    (text: string, sessionId: number): void => {
      if (sessionId !== sessionIdRef.current) {
        return
      }
      updateStatus('speaking')
      void speakText(
        text,
        () => {
          if (sessionId === sessionIdRef.current) {
            void startListening(sessionId)
          }
        },
        (error) => {
          if (sessionId !== sessionIdRef.current) {
            return
          }
          toast.error(error.message)
          void startListening(sessionId)
        }
      )
    },
    [startListening, updateStatus]
  )

  /**
   * 在文字模式朗读 AI 回复后等待输入
   * @param text 英文回复
   * @param sessionId 目标会话编号
   * @returns 无返回值
   */
  const speakTextReply = useCallback(
    (text: string, sessionId: number): void => {
      if (sessionId !== sessionIdRef.current) {
        return
      }
      updateStatus('speaking')
      void speakText(
        text,
        /** 朗读完成后恢复文字输入 */
        () => {
          if (sessionId === sessionIdRef.current) {
            updateStatus('awaiting-input')
          }
        },
        /** 朗读失败后提示并恢复文字输入 */
        (error) => {
          if (sessionId !== sessionIdRef.current) {
            return
          }
          toast.error(error.message)
          updateStatus('awaiting-input')
        }
      )
    },
    [updateStatus]
  )

  /**
   * 请求 AI 生成下一轮回复
   * @param requestInfo 当前请求信息
   * @param sessionId 目标会话编号
   * @returns 回复任务
   */
  const requestConversationReply = useCallback(
    async (requestInfo: FailedConversationRequest, sessionId: number): Promise<void> => {
      if (inputMode === 'voice') {
        stopListening()
      }
      updateStatus('thinking')
      setErrorMessage('')
      failedRequestRef.current = requestInfo

      // 发送给模型的最近上下文
      const history = messagesRef.current.slice(-12).map(({ role, text }) => ({ role, text }))
      // 当前实际执行和失败重试使用的请求信息
      let resolvedRequestInfo = requestInfo

      try {
        // AI 口语教练响应
        let response = await invokeConversationCoach(
          createConversationRequest(resolvedRequestInfo, history)
        )
        if (sessionId !== sessionIdRef.current) {
          return
        }

        // 首次开场是否与近期成功开场明显重复
        const shouldRetryOpening =
          resolvedRequestInfo.isOpening &&
          !resolvedRequestInfo.hasOpeningDeduplicationRetried &&
          isRepeatedConversationOpening(
            response.reply,
            resolvedRequestInfo.recentOpeningRecords ?? []
          )
        if (shouldRetryOpening) {
          // 本次去重重试使用的新灵感键
          const retryInspirationKey = selectConversationOpeningInspiration(
            resolvedRequestInfo.recentOpeningRecords ?? [],
            resolvedRequestInfo.openingInspirationKey
          )
          resolvedRequestInfo = {
            ...resolvedRequestInfo,
            openingInspirationKey: retryInspirationKey,
            conflictingOpening: response.reply,
            hasOpeningDeduplicationRetried: true
          }
          failedRequestRef.current = resolvedRequestInfo
          response = await invokeConversationCoach(
            createConversationRequest(resolvedRequestInfo, history)
          )
          if (sessionId !== sessionIdRef.current) {
            return
          }
        }

        if (requestInfo.userText) {
          updateMessages((previousMessages) => {
            // 最后一个用户消息索引
            const userMessageIndex = previousMessages.findLastIndex(
              (message) => message.role === 'user'
            )
            return previousMessages.map((message, index) =>
              index === userMessageIndex ? { ...message, correction: response.correction } : message
            )
          })
        }

        if (resolvedRequestInfo.isOpening && resolvedRequestInfo.openingInspirationKey) {
          saveConversationOpeningRecord({
            text: response.reply,
            inspirationKey: resolvedRequestInfo.openingInspirationKey
          })
        }

        // 新增的 AI 回复消息
        const assistantMessage: ConversationMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: response.reply,
          translation: response.translation
        }
        updateMessages((previousMessages) => [...previousMessages, assistantMessage])
        failedRequestRef.current = null
        // 文字模式朗读偏好对应的后续行为
        const textReplyContinuationMap = {
          /** 开启时朗读回复并等待下一次文字输入 */
          read: () => speakTextReply(response.reply, sessionId),
          /** 关闭时直接等待下一次文字输入 */
          silent: () => updateStatus('awaiting-input')
        }
        // 当前文字回复处理策略
        const textReplyStrategy = isTextReplySpeechEnabledRef.current ? 'read' : 'silent'
        // 输入模式对应的 AI 回复后续行为
        const replyContinuationMap: Record<ConversationInputMode, () => void> = {
          /** 语音模式朗读回复并恢复监听 */
          voice: () => speakReply(response.reply, sessionId),
          /** 文字模式按当前偏好朗读或静音 */
          text: textReplyContinuationMap[textReplyStrategy]
        }
        replyContinuationMap[inputMode]()
      } catch (error) {
        if (sessionId !== sessionIdRef.current) {
          return
        }
        // 模型请求错误信息
        const message = error instanceof Error ? error.message : 'AI 回复生成失败，请稍后重试。'
        updateStatus('error')
        setErrorMessage(message)
      }
    },
    [
      inputMode,
      saveConversationOpeningRecord,
      speakReply,
      speakTextReply,
      stopListening,
      updateMessages,
      updateStatus
    ]
  )

  /** 开始一段新的自由对话 */
  const startConversation = useCallback((): void => {
    if (!ensureModelReady()) {
      return
    }
    sessionIdRef.current += 1
    manualSpeechRequestIdRef.current += 1
    manualSpeechRestoreStatusRef.current = null
    setManualSpeechTarget(null)
    // 新会话编号
    const sessionId = sessionIdRef.current
    if (inputMode === 'voice') {
      stopListening()
    }
    stopSpeaking()
    failedRequestRef.current = null
    updateMessages([])
    setErrorMessage('')
    void getRecentOpeningRecords().then((recentOpeningRecords) => {
      if (sessionId !== sessionIdRef.current) {
        return
      }
      // 当前新会话随机选择的开场灵感键
      const openingInspirationKey = selectConversationOpeningInspiration(recentOpeningRecords)
      void requestConversationReply(
        { isOpening: true, openingInspirationKey, recentOpeningRecords },
        sessionId
      )
    })
  }, [
    ensureModelReady,
    getRecentOpeningRecords,
    inputMode,
    requestConversationReply,
    stopListening,
    updateMessages
  ])

  /** 提交打字模式中的用户英文表达 */
  const submitTextMessage = useCallback(
    (text: string): boolean => {
      // 清理首尾空白后的用户输入
      const userText = text.trim()
      if (inputMode !== 'text' || statusRef.current !== 'awaiting-input' || !userText) {
        return false
      }

      // 当前文字用户消息
      const userMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        text: userText
      }
      updateMessages((previousMessages) => [...previousMessages, userMessage])
      void requestConversationReply({ isOpening: false, userText }, sessionIdRef.current)
      return true
    },
    [inputMode, requestConversationReply, updateMessages]
  )

  /** 暂停当前监听 */
  const pauseConversation = useCallback((): void => {
    if (statusRef.current !== 'listening') {
      return
    }
    stopListening()
    updateStatus('paused')
  }, [stopListening, updateStatus])

  /** 继续已暂停的对话 */
  const resumeConversation = useCallback((): void => {
    if (statusRef.current !== 'paused') {
      return
    }
    updateStatus('initializing')
    void startListening(sessionIdRef.current)
  }, [startListening, updateStatus])

  /** 结束当前对话并保留页面记录 */
  const endConversation = useCallback((): void => {
    sessionIdRef.current += 1
    manualSpeechRequestIdRef.current += 1
    manualSpeechRestoreStatusRef.current = null
    setManualSpeechTarget(null)
    if (inputMode === 'voice') {
      stopListening()
    }
    stopSpeaking()
    failedRequestRef.current = null
    setErrorMessage('')
    updateStatus('idle')
  }, [inputMode, stopListening, updateStatus])

  /** 重试最近一次失败的 AI 回复 */
  const retryReply = useCallback((): void => {
    if (!failedRequestRef.current || !ensureModelReady()) {
      return
    }
    manualSpeechRequestIdRef.current += 1
    manualSpeechRestoreStatusRef.current = null
    setManualSpeechTarget(null)
    stopSpeaking()
    void requestConversationReply(failedRequestRef.current, sessionIdRef.current)
  }, [ensureModelReady, requestConversationReply])

  /** 注册本地识别结果监听 */
  useEffect(() => {
    /** 处理识别就绪 */
    const handleReady = (): void => {
      if (statusRef.current === 'initializing') {
        updateStatus('listening')
      }
    }
    /** 处理 Whisper 推理开始 */
    const handleProcessing = (_event, response: RecognitionWorkerResponse): void => {
      if (response.type !== 'processing' || statusRef.current !== 'listening') {
        return
      }
      microphoneCaptureRef.current?.stop()
      updateStatus('recognizing')
    }
    /** 处理最终识别结果 */
    const handleFinal = (_event, response: RecognitionWorkerResponse): void => {
      if (response.type !== 'final' || statusRef.current !== 'recognizing') {
        return
      }
      // 清理后的用户英文表达
      const userText = formatRecognizedEnglish(response.text)
      if (!userText) {
        void startListening(sessionIdRef.current)
        return
      }
      // 当前用户消息
      const userMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        text: userText
      }
      updateMessages((previousMessages) => [...previousMessages, userMessage])
      void requestConversationReply({ isOpening: false, userText }, sessionIdRef.current)
    }
    /** 处理识别失败 */
    const handleRecognitionError = (_event, response: RecognitionWorkerResponse): void => {
      if (response.type !== 'error') {
        return
      }
      stopListening()
      updateStatus('error')
      setErrorMessage(`本地英文识别失败：${response.message}`)
    }

    window.electron.ipcRenderer.on(SendEnum.RECOGNITION_READY, handleReady)
    window.electron.ipcRenderer.on(SendEnum.RECOGNITION_PROCESSING, handleProcessing)
    window.electron.ipcRenderer.on(SendEnum.RECOGNITION_FINAL, handleFinal)
    window.electron.ipcRenderer.on(SendEnum.RECOGNITION_ERROR, handleRecognitionError)

    return () => {
      window.electron.ipcRenderer.removeAllListeners(SendEnum.RECOGNITION_READY)
      window.electron.ipcRenderer.removeAllListeners(SendEnum.RECOGNITION_PROCESSING)
      window.electron.ipcRenderer.removeAllListeners(SendEnum.RECOGNITION_FINAL)
      window.electron.ipcRenderer.removeAllListeners(SendEnum.RECOGNITION_ERROR)
    }
  }, [requestConversationReply, startListening, stopListening, updateMessages, updateStatus])

  /** 页面卸载时释放所有会话资源 */
  useEffect(() => {
    return () => {
      sessionIdRef.current += 1
      microphoneCaptureRef.current?.stop()
      window.electron.ipcRenderer.send(SendEnum.RECOGNITION_STOP)
      stopSpeaking()
    }
  }, [])

  return {
    status,
    inputMode,
    isTextReplySpeechEnabled,
    messages,
    manualSpeechTarget,
    errorMessage,
    isConversationActive: ACTIVE_CONVERSATION_STATUSES.has(status),
    canRetryReply: Boolean(failedRequestRef.current),
    canPlayMessageSpeech:
      Boolean(manualSpeechTarget) || MANUAL_SPEECH_STATUSES.has(status),
    changeInputMode,
    changeTextReplySpeech,
    toggleManualSpeech,
    startConversation,
    submitTextMessage,
    pauseConversation,
    resumeConversation,
    endConversation,
    retryReply
  }
}
