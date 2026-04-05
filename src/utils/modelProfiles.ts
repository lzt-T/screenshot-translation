import { BUILTIN_FREE_MODEL, TranslationModelProfile } from '../type/model'

/** 默认激活模型 ID */
export const DEFAULT_ACTIVE_MODEL_ID = 'builtin-glm-free'

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
