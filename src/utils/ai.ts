import { Model, GlmModel, GeminiModel, GptModel, DeepSeekModel } from '../type/model'
import { TargetLanguage } from '../type/model'

/** 获取翻译prompt */
export const getTranslatePrompt = (targetLanguage: TargetLanguage) => {
  return `请将以下文本翻译为${targetLanguage}。用户输入可能包含由 \"<translate_separator>\" 分隔的多个段落，你必须在翻译结果中完整且精确保留这些分隔符，不要省略或修改它们。只返回翻译后的文本和分隔符。如果没有分隔符，则直接返回翻译后的文本。如果已经是${targetLanguage}，则直接返回原文。`
}

/** 获取英汉互译prompt */
export const getEnglishChineseTranslationPrompt = () => {
  return `，这个如何翻译？
  规则：
  如果是简体中文，则翻译为英语；如果是英语，则翻译为简体中文，只返回翻译结果，不要加任何解释。`
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
