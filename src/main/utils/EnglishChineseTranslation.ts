import { Model, ModelName } from "../../type/model";
import { EnglishChineseTranslation as translateTextGemini } from './geminiAi'
import { EnglishChineseTranslation as translateTextGLM } from './glmAi'
import { EnglishChineseTranslation as translateTextGPT } from './gptAi'
import { EnglishChineseTranslation as translateTextDeepSeek } from './deepseekAi';
import { getModelType } from "../../utils/ai";


/**
 * 英汉互译
 * @param modelName 模型名称
 * @param apiKey API密钥
 * @param text 文本
 * @returns 翻译结果
 */
export const EnglishChineseTranslation = async (modelName: ModelName, apiKey: string, text: string): Promise<string> => {
  try {
    const translateConfig = {
      [Model.GLM]: translateTextGLM,
      [Model.GEMINI]: translateTextGemini,
      [Model.GPT]: translateTextGPT,
      [Model.DEEP_SEEK]: translateTextDeepSeek
    }
    const translateFunction = translateConfig[getModelType(modelName)]
    const translateResult = await translateFunction(modelName, apiKey, text)
    return translateResult.translation
  } catch (error) {
    throw error
  }
}