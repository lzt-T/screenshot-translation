import { Model, GlmModel, GeminiModel, GptModel, DeepSeekModel } from '../type/model'
import { TargetLanguage } from '../type/model'

/** 获取翻译prompt */
export const getTranslatePrompt = (text: string, targetLanguage: TargetLanguage) => {

  const config = {
    [TargetLanguage.ZH_CN]: '简体中文',
    [TargetLanguage.EN_US]: '英语'
  }

  return `
  背景：你是一个翻译专家，擅长将文本翻译为${config[targetLanguage]}\n
  用户输入：${text}\n
  输出：用户输入可能包含由 \"<translate_separator>\" 分隔的多个段落，你必须在翻译结果中完整且精确保留这些分隔符，不要省略或修改它们。\n
  只返回翻译后的文本和分隔符。如果没有分隔符，则直接返回翻译后的文本。如果已经是${config[targetLanguage]}，则直接返回原文。\n
  如果用户输入是空字符串，则返回空字符串。`
}

/** 获取英汉互译prompt */
export const getEnglishChineseTranslationPrompt = (text: string) => {

  const isEnglish = /[a-zA-Z]/.test(text)
  const isChinese = /[\u4e00-\u9fa5]/.test(text)
  let targetLanguage = ''

  if (isEnglish) {
    targetLanguage = '简体中文'
  }

  if (isChinese) {
    targetLanguage = '英语'
  }

  if (isEnglish && isChinese) {
    return `
    背景：你是一个翻译专家，擅长将给出的"文本内容"翻译为简体中文和英语。\n
    文本内容："${text}"\n
    输出：不管用户输入什么都返回"文本内容"的翻译结果，不要加任何解释。输出简体中文和英语的翻译结果。`
  }

  return `
  背景：你是一个翻译专家，擅长将给出的"文本内容"翻译为${targetLanguage}。\n
  文本内容："${text}"\n
  输出：不管用户输入什么都返回"文本内容"的翻译结果，不要加任何解释。`
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
