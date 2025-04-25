import { Model, ModelName } from '../type/model'

/** 获取prompt */
export const getPrompt = () => {
  return `请将以下英文文本翻译成中文，只返回翻译结果，不要有其他文字。用户输入可能包含由 \"<translate_separator>\" 分隔的多个段落，你必须在翻译结果中完整且精确保留这些分隔符，不要省略或修改它们。只返回翻译后的文本和分隔符。如果没有分隔符，则直接返回翻译后的文本。`
}

/** 获取模型类型 */
export const getModelType = (modelName: ModelName): Model => {
  let glmList = [ModelName.GLM_4_FLASH_250414]
  let geminiList = [ModelName.GEMINI_2_0_FLASH, ModelName.GEMINI_1_5_FLASH]
  if (glmList.includes(modelName)) {
    return Model.GLM
  }
  if (geminiList.includes(modelName)) {
    return Model.GEMINI
  }
  return Model.GEMINI
}
