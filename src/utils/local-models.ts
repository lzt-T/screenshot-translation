import type {
  LocalModelDownloadMirror,
  LocalModelDownloadSourceSetting,
  LocalModelId
} from '../type/local-model'

/** 单个必需模型文件的校验要求 */
export interface LocalModelFileRequirement {
  /** 相对于模型目录的路径 */
  relativePath: string
  /** 允许的最小字节数，用于过滤空文件与 LFS 指针 */
  minSizeBytes: number
}

/** 本地模型清单定义 */
export interface LocalModelDefinition {
  /** 模型标识 */
  id: LocalModelId
  /** 模型显示名称 */
  name: string
  /** 模型用途说明 */
  description: string
  /** 安装体积提示 */
  sizeLabel: string
  /** 模型分类目录名 */
  categoryDir: 'tts' | 'asr'
  /** 解压后的模型文件夹名 */
  folderName: string
  /** 官方压缩包文件名 */
  archiveFileName: string
  /** 官方 GitHub Release 下载地址 */
  officialUrl: string
  /** 校验模型目录完整性所需的核心文件清单 */
  requiredFiles: ReadonlyArray<LocalModelFileRequirement>
}

/** 固定顺序的本地按需模型标识列表 */
export const LOCAL_MODEL_IDS: ReadonlyArray<LocalModelId> = ['kokoro-tts', 'whisper-asr']

/** 本地按需模型清单映射 */
export const LOCAL_MODEL_DEFINITIONS: Readonly<Record<LocalModelId, LocalModelDefinition>> = {
  'kokoro-tts': {
    id: 'kokoro-tts',
    name: 'Kokoro 本地语音模型',
    description: '支持英文与中文离线自然朗读，适合翻译结果与口语对话播报。',
    sizeLabel: '约 205 MB',
    categoryDir: 'tts',
    folderName: 'kokoro-int8-multi-lang-v1_1',
    archiveFileName: 'kokoro-int8-multi-lang-v1_1.tar.bz2',
    officialUrl:
      'https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/kokoro-int8-multi-lang-v1_1.tar.bz2',
    requiredFiles: [
      { relativePath: 'model.int8.onnx', minSizeBytes: 10 * 1024 * 1024 },
      { relativePath: 'voices.bin', minSizeBytes: 10 * 1024 * 1024 },
      { relativePath: 'tokens.txt', minSizeBytes: 100 },
      { relativePath: 'lexicon-us-en.txt', minSizeBytes: 1000 },
      { relativePath: 'lexicon-zh.txt', minSizeBytes: 1000 },
      { relativePath: 'espeak-ng-data/phondata', minSizeBytes: 1000 }
    ]
  },
  'whisper-asr': {
    id: 'whisper-asr',
    name: 'Whisper 英文识别模型',
    description: '配合内置 Silero VAD 实现本地离线英文语音识别，用于口语对话语音练习。',
    sizeLabel: '约 154 MB',
    categoryDir: 'asr',
    folderName: 'sherpa-onnx-whisper-base.en',
    archiveFileName: 'sherpa-onnx-whisper-base.en.tar.bz2',
    officialUrl:
      'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-base.en.tar.bz2',
    requiredFiles: [
      { relativePath: 'base.en-encoder.int8.onnx', minSizeBytes: 10 * 1024 * 1024 },
      { relativePath: 'base.en-decoder.int8.onnx', minSizeBytes: 10 * 1024 * 1024 },
      { relativePath: 'base.en-tokens.txt', minSizeBytes: 1000 }
    ]
  }
}

/** 模型下载源选项定义 */
export const LOCAL_MODEL_MIRRORS: Readonly<
  Record<LocalModelDownloadMirror, { label: string; description: string }>
> = {
  official: {
    label: 'GitHub 官方（走当前代理）',
    description: '从 sherpa-onnx 官方 Release 下载，自动沿用本应用的网络代理设置。'
  },
  ghfast: {
    label: 'GitHub 加速镜像（ghfast.top）',
    description: '适合国内直连下载，通过公开镜像加速获取官方模型压缩包。'
  },
  custom: {
    label: '自定义下载地址',
    description: '分别指定模型压缩包的完整 HTTP/HTTPS 下载链接（需为 .tar.bz2 格式）。'
  }
}

/** 各下载源模式对应的下载地址解析策略 */
const MODEL_DOWNLOAD_URL_RESOLVERS: Readonly<
  Record<
    LocalModelDownloadMirror,
    (definition: LocalModelDefinition, sourceSetting: LocalModelDownloadSourceSetting) => string
  >
> = {
  official: (definition) => definition.officialUrl,
  ghfast: (definition) => `https://ghfast.top/${definition.officialUrl}`,
  custom: (definition, sourceSetting) =>
    sourceSetting.customUrls[definition.id]?.trim() || definition.officialUrl
}

/**
 * 创建默认的本地模型下载源配置
 * @returns 默认下载源配置
 */
export function createDefaultLocalModelSourceSetting(): LocalModelDownloadSourceSetting {
  return {
    mirror: 'official',
    customUrls: {}
  }
}

/**
 * 读取旧配置时补齐缺失字段并过滤无效枚举
 * @param value 已持久化的配置片段
 * @returns 规范化后的下载源配置
 */
export function normalizeLocalModelSourceSetting(
  value?: Partial<LocalModelDownloadSourceSetting> | null
): LocalModelDownloadSourceSetting {
  // 完整默认配置
  const defaults = createDefaultLocalModelSourceSetting()
  // 当前镜像模式
  const mirror =
    value?.mirror && Object.hasOwn(LOCAL_MODEL_MIRRORS, value.mirror)
      ? value.mirror
      : defaults.mirror
  // 自定义地址映射
  const customUrls: Partial<Record<LocalModelId, string>> = {}
  for (const modelId of LOCAL_MODEL_IDS) {
    const rawUrl = value?.customUrls?.[modelId]
    if (typeof rawUrl === 'string' && rawUrl.trim()) {
      customUrls[modelId] = rawUrl.trim()
    }
  }
  return {
    mirror,
    customUrls
  }
}

/**
 * 解析指定模型当前应使用的下载地址
 * @param id 模型标识
 * @param sourceSetting 下载源配置
 * @returns 完整下载 URL
 */
export function resolveModelDownloadUrl(
  id: LocalModelId,
  sourceSetting?: Partial<LocalModelDownloadSourceSetting> | null
): string {
  // 模型定义
  const definition = LOCAL_MODEL_DEFINITIONS[id]
  // 规范化后的下载源配置
  const normalizedSetting = normalizeLocalModelSourceSetting(sourceSetting)
  return MODEL_DOWNLOAD_URL_RESOLVERS[normalizedSetting.mirror](definition, normalizedSetting)
}

/**
 * 校验模型下载地址是否合法（仅允许不带凭据的 HTTP/HTTPS 地址）
 * @param url 待校验的 URL 字符串
 * @returns 空字符串表示有效，否则返回中文错误提示
 */
export function validateModelDownloadUrl(url: string): string {
  // 清理首尾空白后的地址
  const trimmedUrl = url.trim()
  if (!trimmedUrl) {
    return '请输入模型下载地址'
  }
  try {
    // 解析后的 URL
    const parsedUrl = new URL(trimmedUrl)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return '下载地址必须以 http:// 或 https:// 开头'
    }
    if (parsedUrl.username || parsedUrl.password) {
      return '下载地址不能包含用户名或密码'
    }
    return ''
  } catch {
    return '请输入有效的 HTTP 或 HTTPS 下载地址'
  }
}

/**
 * 将字节数格式化为易读的文件大小文本
 * @param bytes 字节数
 * @returns 格式化后的大小文本
 */
export function formatModelBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 MB'
  }
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
