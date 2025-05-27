/** 模型类型 */
export enum Model {
  GEMINI = 'gemini',
  GLM = 'glm'
}

/** Gemini模型 */
export enum GeminiModel {
  GEMINI_2_0_FLASH = 'gemini-2.0-flash',
  GEMINI_2_5_FLASH_PREVIEW_05_20 = 'gemini-2.5-flash-preview-05-20',
}

/** Glm模型 */
export enum GlmModel {
  GLM_4_FLASH_250414 = 'glm-4-flash-250414',
}

/** 模型类型 */
export type ModelName = GeminiModel | GlmModel
