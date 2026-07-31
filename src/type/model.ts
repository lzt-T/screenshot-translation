/** 内置免费模型名称 */
export const BUILTIN_FREE_MODEL = 'glm-4.7-flash'

/** 用户可配置的翻译模型信息 */
export interface TranslationModelProfile {
  /* 模型配置主键 */
  id: string
  /* OpenAI 兼容网关地址 */
  baseUrl?: string
  /* 实际模型名 */
  model: string
  /* 模型 API Key */
  apiKey: string
  /* 是否内置免费模型 */
  isBuiltInFree?: boolean
  /* UI 显示名称 */
  displayName?: string
}

/** 开机自启动设置 */
export interface AutoLaunchSetting {
  /* 是否开启开机自启动 */
  enabled: boolean
}
