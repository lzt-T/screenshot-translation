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

/** 用户可编辑的模型字段 */
export type ModelFieldKey = 'displayName' | 'baseUrl' | 'model' | 'apiKey'

/** 模型配置字段错误 */
export interface ModelProfileValidationErrors {
  /* 模型名称错误 */
  model?: string
  /* Base URL 错误 */
  baseUrl?: string
  /* API Key 错误 */
  apiKey?: string
}

/** 模型配置校验结果 */
export interface ModelProfileValidationResult {
  /* 配置是否有效 */
  isValid: boolean
  /* 字段错误集合 */
  errors: ModelProfileValidationErrors
}

/** 模型连接测试结果 */
export interface ModelConnectionTestResult {
  /* 连接是否成功 */
  success: boolean
  /* 测试结果说明 */
  message: string
}

/** 开机自启动设置 */
export interface AutoLaunchSetting {
  /* 是否开启开机自启动 */
  enabled: boolean
}
