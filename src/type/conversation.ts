/** 对话运行状态 */
export type ConversationStatus =
  | 'idle'
  | 'initializing'
  | 'listening'
  | 'awaiting-input'
  | 'thinking'
  | 'speaking'
  | 'paused'
  | 'error'

/** 对话输入模式 */
export type ConversationInputMode = 'voice' | 'text'

/** 对话角色 */
export type ConversationRole = 'user' | 'assistant'

/** AI 对用户表达的纠正 */
export interface ConversationCorrection {
  /** 更自然的英文表达 */
  suggestedText: string
  /** 简体中文说明 */
  explanation: string
}

/** 单条上下文消息 */
export interface ConversationHistoryItem {
  /** 消息角色 */
  role: ConversationRole
  /** 英文消息正文 */
  text: string
}

/** 页面展示的对话消息 */
export interface ConversationMessage extends ConversationHistoryItem {
  /** 页面内消息主键 */
  id: string
  /** AI 回复的中文释义 */
  translation?: string
  /** 对用户表达的纠正 */
  correction?: ConversationCorrection | null
}

/** 新会话开场灵感键 */
export type ConversationOpeningInspirationKey =
  | 'choice'
  | 'imagination'
  | 'observation'
  | 'recommendation'
  | 'description'
  | 'opinion'
  | 'planning'
  | 'problem-solving'

/** 本地保存的新会话开场记录 */
export interface ConversationOpeningRecord {
  /** 最终采用的英文开场 */
  text: string
  /** 生成该开场时使用的灵感键 */
  inspirationKey: ConversationOpeningInspirationKey
}

/** 口语教练请求 */
export interface ConversationRequest {
  /** 是否请求生成开场白 */
  isOpening: boolean
  /** 当前开场的宽泛生成灵感 */
  openingInspiration?: string
  /** 最近使用过的开场白 */
  recentOpenings?: string[]
  /** 当前重试必须避开的冲突开场 */
  conflictingOpening?: string
  /** 最近的对话上下文 */
  history: ConversationHistoryItem[]
  /** 当前用户英文表达 */
  userText?: string
}

/** 口语教练响应 */
export interface ConversationCoachResponse {
  /** AI 英文回复 */
  reply: string
  /** AI 回复的简体中文释义 */
  translation: string
  /** 当前用户表达的纠正，无需纠正时为 null */
  correction: ConversationCorrection | null
}

/** 识别 Worker 启动消息 */
export interface RecognitionStartMessage {
  /** 消息类型 */
  type: 'start'
}

/** 识别 Worker 音频消息 */
export interface RecognitionAudioMessage {
  /** 消息类型 */
  type: 'audio'
  /** PCM 采样数据 */
  samples: Float32Array
  /** 输入采样率 */
  sampleRate: number
}

/** 识别 Worker 停止消息 */
export interface RecognitionStopMessage {
  /** 消息类型 */
  type: 'stop'
}

/** 识别 Worker 请求 */
export type RecognitionWorkerRequest =
  | RecognitionStartMessage
  | RecognitionAudioMessage
  | RecognitionStopMessage

/** 识别 Worker 响应 */
export type RecognitionWorkerResponse =
  | { type: 'ready' }
  | { type: 'partial'; text: string }
  | { type: 'final'; text: string }
  | { type: 'error'; message: string }
