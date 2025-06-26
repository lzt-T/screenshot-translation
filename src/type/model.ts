/** 模型类型 */
export enum Model {
  GEMINI = 'gemini',
  GLM = 'glm',
  GPT = 'gpt',
  DEEP_SEEK = 'deepseek'
}

/** Gemini模型 */
export enum GeminiModel {
  GEMINI_2_0_FLASH = 'gemini-2.0-flash',
  GEMINI_2_0_FLASH_LITE = 'gemini-2.0-flash-lite',
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


/** 模型类型 */
export type ModelName = GeminiModel | GlmModel | GptModel | DeepSeekModel


/** 目标语言 */
export enum TargetLanguage {
  ZH_CN = "简体中文",
  EN_US = "English"
}

