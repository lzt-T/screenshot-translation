/** 模型类型 */
export enum Model {
  GEMINI = 'gemini',
  GLM = 'glm',
  GPT = 'gpt',
  DEEP_SEEK = 'deepseek',
  /* 内置免费模型 */
  BUILT_IN_FREE = 'built-in-free',
}

/** Gemini模型 */
export enum GeminiModel {
  GEMINI_2_5_FLASH = 'gemini-2.5-flash',
}

/** Glm模型 */
export enum GlmModel {
  GLM_4_FLASH_250414 = 'glm-4-flash-250414',
}

/** GPT模型 */
export enum GptModel {
  GPT_4_1 = 'gpt-4.1',
}

export enum DeepSeekModel {
  DEEP_SEEK_V3='DeepSeek-V3'
}

/** 内置免费模型 */
export enum BuiltInFreeModel {
  GLM_4_FLASH_250414_FREE = 'glm-4-flash-250414-free',
}

/** 模型类型 */
export type ModelName = GeminiModel | GlmModel | GptModel | DeepSeekModel | BuiltInFreeModel

/** 开机自启动设置 */
export interface AutoLaunchSetting {
  enabled: boolean;
}

