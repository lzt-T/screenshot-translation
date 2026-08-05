import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import useLocalForage from '@renderer/hooks/useLocalForage'
import type {
  ConversationCoachResponse,
  ConversationMessage,
  ConversationRequest,
  ConversationStatus,
  RecognitionWorkerResponse
} from '@src/type/conversation'
import { SendEnum } from '@src/type/ipc-constants'
import { speakText, stopSpeaking } from '@src/utils/speak'
import { MicrophoneCapture } from './audio/microphone-capture'

/** 等待重试的模型请求 */
interface FailedConversationRequest {
  /** 是否为开场请求 */
  isOpening: boolean
  /** 当前请求需要避开的开场白 */
  recentOpenings?: string[]
  /** 当前用户表达 */
  userText?: string
}

// 页面内保留的最大开场白数量
const MAX_RECENT_OPENING_COUNT = 4

/** 将识别模型输出整理为适合界面展示的英文文本 */
function formatRecognizedEnglish(text: string): string {
  // 清理首尾空白与连续空格后的文本
  const normalizedText = text.trim().replace(/\s+/gu, ' ')
  // 文本中的英文字母
  const englishLetters = normalizedText.match(/[a-z]/giu)
  // 英文字母是否全部为大写
  const isAllUppercase = englishLetters?.every((letter) => letter === letter.toUpperCase()) ?? false
  if (!normalizedText || !isAllUppercase) {
    return normalizedText
  }

  // 全小写的识别文本
  const lowercaseText = normalizedText.toLocaleLowerCase('en-US')
  // 第一个英文字母的位置
  const firstLetterIndex = lowercaseText.search(/[a-z]/u)
  // 句首字母大写后的文本
  const sentenceCaseText =
    lowercaseText.slice(0, firstLetterIndex) +
    lowercaseText.charAt(firstLetterIndex).toUpperCase() +
    lowercaseText.slice(firstLetterIndex + 1)
  return sentenceCaseText.replace(/\bi(?=(?:['’](?:m|ve|ll|d))?\b)/gu, 'I')
}

/** 管理实时英语口语对话流程 */
export default function useConversation() {
  // 页面路由方法
  const navigate = useNavigate()
  // 当前模型设置
  const { isInit, storeSetting } = useLocalForage()
  // 当前对话状态
  const [status, setStatus] = useState<ConversationStatus>('idle')
  // 页面内对话消息
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  // 当前增量识别文本
  const [liveTranscript, setLiveTranscript] = useState('')
  // 当前可展示错误
  const [errorMessage, setErrorMessage] = useState('')
  // 最新对话状态引用
  const statusRef = useRef<ConversationStatus>('idle')
  // 最新消息引用
  const messagesRef = useRef<ConversationMessage[]>([])
  // 当前会话编号
  const sessionIdRef = useRef(0)
  // 麦克风采集器
  const microphoneCaptureRef = useRef<MicrophoneCapture | null>(null)
  // 等待重试的请求
  const failedRequestRef = useRef<FailedConversationRequest | null>(null)
  // 当前页面最近成功生成的开场白
  const recentOpeningsRef = useRef<string[]>([])

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
      setLiveTranscript('')
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
   * 请求 AI 生成下一轮回复
   * @param requestInfo 当前请求信息
   * @param sessionId 目标会话编号
   * @returns 回复任务
   */
  const requestConversationReply = useCallback(
    async (requestInfo: FailedConversationRequest, sessionId: number): Promise<void> => {
      stopListening()
      updateStatus('thinking')
      setErrorMessage('')
      failedRequestRef.current = requestInfo

      // 发送给模型的最近上下文
      const history = messagesRef.current.slice(-12).map(({ role, text }) => ({ role, text }))
      // 结构化口语教练请求
      const request: ConversationRequest = {
        isOpening: requestInfo.isOpening,
        recentOpenings: requestInfo.recentOpenings,
        history,
        userText: requestInfo.userText
      }

      try {
        // AI 口语教练响应
        const response = (await window.electron.ipcRenderer.invoke(
          SendEnum.CONVERSATION_REPLY,
          request
        )) as ConversationCoachResponse
        if (sessionId !== sessionIdRef.current) {
          return
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

        if (requestInfo.isOpening) {
          recentOpeningsRef.current = [...recentOpeningsRef.current, response.reply].slice(
            -MAX_RECENT_OPENING_COUNT
          )
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
        speakReply(response.reply, sessionId)
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
    [speakReply, stopListening, updateMessages, updateStatus]
  )

  /** 开始一段新的自由对话 */
  const startConversation = useCallback((): void => {
    if (!ensureModelReady()) {
      return
    }
    sessionIdRef.current += 1
    // 新会话编号
    const sessionId = sessionIdRef.current
    stopListening()
    stopSpeaking()
    updateMessages([])
    setLiveTranscript('')
    setErrorMessage('')
    // 当前请求需要避开的最近开场白快照
    const recentOpenings = [...recentOpeningsRef.current]
    void requestConversationReply({ isOpening: true, recentOpenings }, sessionId)
  }, [ensureModelReady, requestConversationReply, stopListening, updateMessages])

  /** 暂停当前监听 */
  const pauseConversation = useCallback((): void => {
    if (statusRef.current !== 'listening') {
      return
    }
    stopListening()
    setLiveTranscript('')
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
    stopListening()
    stopSpeaking()
    failedRequestRef.current = null
    setLiveTranscript('')
    setErrorMessage('')
    updateStatus('idle')
  }, [stopListening, updateStatus])

  /** 重试最近一次失败的 AI 回复 */
  const retryReply = useCallback((): void => {
    if (!failedRequestRef.current || !ensureModelReady()) {
      return
    }
    void requestConversationReply(failedRequestRef.current, sessionIdRef.current)
  }, [ensureModelReady, requestConversationReply])

  /** 页面挂载时后台预加载本地语音模型 */
  useEffect(() => {
    window.electron.ipcRenderer.send(SendEnum.SPEECH_PRELOAD)
  }, [])

  /** 注册实时识别结果监听 */
  useEffect(() => {
    /** 处理识别就绪 */
    const handleReady = (): void => {
      if (statusRef.current === 'initializing') {
        updateStatus('listening')
      }
    }
    /** 处理部分识别结果 */
    const handlePartial = (_event, response: RecognitionWorkerResponse): void => {
      if (response.type === 'partial' && statusRef.current === 'listening') {
        setLiveTranscript(formatRecognizedEnglish(response.text))
      }
    }
    /** 处理最终识别结果 */
    const handleFinal = (_event, response: RecognitionWorkerResponse): void => {
      if (response.type !== 'final' || statusRef.current !== 'listening') {
        return
      }
      // 清理后的用户英文表达
      const userText = formatRecognizedEnglish(response.text)
      if (!userText) {
        return
      }
      // 当前用户消息
      const userMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        text: userText
      }
      setLiveTranscript('')
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
    window.electron.ipcRenderer.on(SendEnum.RECOGNITION_PARTIAL, handlePartial)
    window.electron.ipcRenderer.on(SendEnum.RECOGNITION_FINAL, handleFinal)
    window.electron.ipcRenderer.on(SendEnum.RECOGNITION_ERROR, handleRecognitionError)

    return () => {
      window.electron.ipcRenderer.removeAllListeners(SendEnum.RECOGNITION_READY)
      window.electron.ipcRenderer.removeAllListeners(SendEnum.RECOGNITION_PARTIAL)
      window.electron.ipcRenderer.removeAllListeners(SendEnum.RECOGNITION_FINAL)
      window.electron.ipcRenderer.removeAllListeners(SendEnum.RECOGNITION_ERROR)
    }
  }, [requestConversationReply, stopListening, updateMessages, updateStatus])

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
    messages,
    liveTranscript,
    errorMessage,
    canRetryReply: Boolean(failedRequestRef.current),
    startConversation,
    pauseConversation,
    resumeConversation,
    endConversation,
    retryReply
  }
}
