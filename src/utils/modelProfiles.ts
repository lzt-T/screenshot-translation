import {
  BUILTIN_FREE_MODEL,
  ModelProfileValidationErrors,
  ModelProfileValidationResult,
  TranslationModelProfile
} from '../type/model'

/** 默认激活模型 ID */
export const DEFAULT_ACTIVE_MODEL_ID = 'builtin-glm-free'

/**
 * 判断模型是否属于 Gemini
 * @param modelName 模型名称
 * @returns 是否为 Gemini 模型
 */
export const isGeminiModel = (modelName: string): boolean => {
  return modelName.trim().toLowerCase().startsWith('gemini-')
}

/**
 * 判断 Base URL 是否为有效的 HTTP 地址
 * @param baseUrl Base URL
 * @returns 地址是否有效
 */
const isValidHttpUrl = (baseUrl: string): boolean => {
  try {
    // 解析后的 URL
    const parsedUrl = new URL(baseUrl)
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * 校验模型配置是否可以用于翻译
 * @param profile 模型配置
 * @returns 字段错误与整体有效状态
 */
export const validateModelProfile = (
  profile: TranslationModelProfile
): ModelProfileValidationResult => {
  if (profile.isBuiltInFree) {
    return { isValid: true, errors: {} }
  }

  // 标准化后的模型名称
  const modelName = profile.model.trim()
  // 标准化后的 Base URL
  const baseUrl = profile.baseUrl?.trim() || ''
  // 标准化后的 API Key
  const apiKey = profile.apiKey.trim()
  // 当前字段错误
  const errors: ModelProfileValidationErrors = {}

  if (!modelName) {
    errors.model = '请输入模型名'
  }
  if (!apiKey) {
    errors.apiKey = '请输入 API Key'
  }
  if (!isGeminiModel(modelName) && !baseUrl) {
    errors.baseUrl = '请输入 Base URL'
  } else if (baseUrl && !isValidHttpUrl(baseUrl)) {
    errors.baseUrl = '请输入有效的 HTTP 或 HTTPS 地址'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * 创建默认模型配置列表
 * @returns {TranslationModelProfile[]} 默认模型配置
 */
export const createDefaultModelProfiles = (): TranslationModelProfile[] => {
  // 默认模型配置列表
  const profiles: TranslationModelProfile[] = [
    {
      id: DEFAULT_ACTIVE_MODEL_ID,
      baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
      model: BUILTIN_FREE_MODEL,
      apiKey: '',
      isBuiltInFree: true,
      displayName: 'GLM 免费模型'
    }
  ]

  return profiles
}
