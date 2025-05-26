/** 模型类型 */
export enum Model {
  GEMINI = 'gemini',
  GLM = 'glm'
}

/** Gemini模型 */
export enum GeminiModel {
  GEMINI_2_0_FLASH = 'gemini-2.0-flash',
  GEMINI_1_5_FLASH = 'gemini-1.5-flash',
}

/** Glm模型 */
export enum GlmModel {
  GLM_4_FLASH_250414 = 'glm-4-flash-250414',
}

/** 模型类型 */
export type ModelName = GeminiModel | GlmModel
