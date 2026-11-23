/** 本地按需下载模型标识 */
export type LocalModelId = 'kokoro-tts' | 'whisper-asr'

/** 本地模型安装与下载状态 */
export type LocalModelStatus =
  | 'not-installed'
  | 'downloading'
  | 'extracting'
  | 'installed'
  | 'error'

/** 已就绪模型的来源类型 */
export type LocalModelSourceKind = 'user-data' | 'bundled-compat'

/** 本地模型下载源模式 */
export type LocalModelDownloadMirror = 'official' | 'ghfast' | 'custom'

/** 持久化的本地模型下载源配置 */
export interface LocalModelDownloadSourceSetting {
  /** 当前选择的下载源模式 */
  mirror: LocalModelDownloadMirror
  /** 自定义模式下按模型记录的下载地址 */
  customUrls: Partial<Record<LocalModelId, string>>
}

/** 主进程同步给渲染进程的本地模型状态 */
export interface LocalModelState {
  /** 模型标识 */
  id: LocalModelId
  /** 当前安装或下载状态 */
  status: LocalModelStatus
  /** 模型文件来源（仅已安装时有值） */
  sourceKind: LocalModelSourceKind | null
  /** 当前已下载字节数 */
  downloadedBytes: number
  /** 模型压缩包总字节数（未知时为 0） */
  totalBytes: number
  /** 当前阶段百分比（0-100） */
  progress: number
  /** 失败或校验错误信息 */
  error?: string
  /** 已就绪模型的本地目录路径 */
  installedPath?: string
}
