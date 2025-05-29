import { Model, GlmModel, GeminiModel, GptModel, DeepSeekModel } from '../type/model'
import { TargetLanguage } from '../type/model'

/** 获取prompt */
export const getPrompt = (targetLanguage: TargetLanguage) => {
  return `请将以下文本翻译成${targetLanguage}，只返回翻译结果，不要有其他文字。用户输入可能包含由 \"<translate_separator>\" 分隔的多个段落，你必须在翻译结果中完整且精确保留这些分隔符，不要省略或修改它们。只返回翻译后的文本和分隔符。如果没有分隔符，则直接返回翻译后的文本。`
}

/** 获取模型类型 */
export const getModelType = (modelName: GlmModel | GeminiModel | GptModel | DeepSeekModel): Model => {
  if (Object.values(GlmModel).includes(modelName as unknown as GlmModel)) {
    return Model.GLM
  }

  if (Object.values(GeminiModel).includes(modelName as unknown as GeminiModel)) {
    return Model.GEMINI
  }

  if (Object.values(GptModel).includes(modelName as unknown as GptModel)) {
    return Model.GPT
  }

  if (Object.values(DeepSeekModel).includes(modelName as unknown as DeepSeekModel)) {
    return Model.DEEP_SEEK
  }
  return Model.GEMINI
}
