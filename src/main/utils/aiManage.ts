import { Model } from "../../type/model";
import { ModelName, GeminiModel, GptModel, DeepSeekModel, BuiltInFreeModel } from "../../type/model";
import { GlmModel } from "../../type/model";
import { translateText as translateTextGLM } from "./aiClients/glmAi";
import { translateText as translateTextGemini } from "./aiClients/geminiAi";
import { translateText as translateTextGPT } from "./aiClients/gptAi";
import { translateText as translateTextDeepSeek } from "./aiClients/deepseekAi";
import { EnglishChineseTranslation as translateTextGLMEnglishChineseTranslation } from "./aiClients/glmAi";
import { EnglishChineseTranslation as translateTextGeminiEnglishChineseTranslation } from "./aiClients/geminiAi";
import { EnglishChineseTranslation as translateTextGPTEnglishChineseTranslation } from "./aiClients/gptAi";
import { EnglishChineseTranslation as translateTextDeepSeekEnglishChineseTranslation } from "./aiClients/deepseekAi";
import { getModelType } from "../../utils/ai";
import { setGeminiClient } from "./aiClients/geminiAi";
import { setZhipuClient } from "./aiClients/glmAi";
import { setOpenaiClient } from "./aiClients/gptAi";
import { setDeepSeekClient } from "./aiClients/deepseekAi";
import { Language } from '../../type/base'

class AiManage {

  /* 当前设置API Key */
  public currentApiKeys: {
    [Model.GEMINI]: string,
    [Model.GLM]: string,
    [Model.GPT]: string,
    [Model.DEEP_SEEK]: string
  } = {
      [Model.GEMINI]: '',
      [Model.GLM]: '',
      [Model.GPT]: '',
      [Model.DEEP_SEEK]: ''
    }

  /* 当前翻译模型名称 */
  public currentTranslationModelName: ModelName = BuiltInFreeModel.GLM_4_FLASH_250414_FREE

  constructor() { }

  /**
   * @description 设置当前设置API Key
   * @param {Object} apiKeys  API Key对象
   */
  public setCurrentApiKeys(apiKeys: {
    [Model.GEMINI]: string,
    [Model.GLM]: string,
    [Model.GPT]: string,
    [Model.DEEP_SEEK]: string
  }) {
    this.currentApiKeys = apiKeys
  }

  /**
   * @description 获取当前翻译模型API Key
   * @param {ModelName} modelName 模型名称
   * @returns {string} API Key
   */
  public getApiKey() {
    if (Object.values(GlmModel).includes(this.currentTranslationModelName as unknown as GlmModel)) {
      return this.currentApiKeys[Model.GLM]
    }
    if (Object.values(GeminiModel).includes(this.currentTranslationModelName as unknown as GeminiModel)) {
      return this.currentApiKeys[Model.GEMINI]
    }
    if (Object.values(GptModel).includes(this.currentTranslationModelName as unknown as GptModel)) {
      return this.currentApiKeys[Model.GPT]
    }
    if (Object.values(DeepSeekModel).includes(this.currentTranslationModelName as unknown as DeepSeekModel)) {
      return this.currentApiKeys[Model.DEEP_SEEK]
    }

    if (Object.values(BuiltInFreeModel).includes(this.currentTranslationModelName as unknown as BuiltInFreeModel)) {
      if (this.currentTranslationModelName === BuiltInFreeModel.GLM_4_FLASH_250414_FREE) {
        return import.meta.env.MAIN_VITE_GML_FREE_API_KEY
      }
    }
    return ''
  }

  /* 初始化Ai客户端 */
  public initAiClient() {
    if (this.currentApiKeys[Model.GEMINI]) {
      setGeminiClient(this.currentApiKeys[Model.GEMINI])
    }
    if (this.currentApiKeys[Model.GLM]) {
      setZhipuClient(this.currentApiKeys[Model.GLM])
    }
    if (this.currentApiKeys[Model.GPT]) {
      setOpenaiClient(this.currentApiKeys[Model.GPT])
    }
    if (this.currentApiKeys[Model.DEEP_SEEK]) {
      setDeepSeekClient(this.currentApiKeys[Model.DEEP_SEEK])
    }
  }



  /**
   * @description 设置当前翻译模型名称
   * @param {ModelName} modelName 模型名称
   */
  public setCurrentTranslationModelName(modelName: ModelName) {
    this.currentTranslationModelName = modelName
  }

  /**
   * @description 文字翻译
   * @param {string} text 需要翻译的文本
   * @param {Language} targetLanguage 目标语言
   * @returns {Promise<{success: boolean, translation: string, msg?: string}>} 翻译结果
   */
  public async translateText(text: string, targetLanguage: Language) {
    const translateConfig = {
      [Model.GLM]: translateTextGLM,
      [Model.GEMINI]: translateTextGemini,
      [Model.GPT]: translateTextGPT,
      [Model.DEEP_SEEK]: translateTextDeepSeek
    }
    const translateFunction = translateConfig[getModelType(this.currentTranslationModelName)]
    const translateResult = await translateFunction(this.currentTranslationModelName, text, this.getApiKey(), targetLanguage)

    return translateResult
  }

  /**
   * @description 英汉互译
   * @param {string} text 需要翻译的文本
   * @returns {Promise<{success: boolean, translation: string, msg?: string}>} 翻译结果
   */
  public async englishChineseTranslation(text: string): Promise<{ success: boolean, translation: string, msg?: string }> {
    const apiKey = this.getApiKey()
    if (!apiKey) {
      return { success: false, translation: '', msg: `${this.currentTranslationModelName} 模型的 API Key 未配置` }
    }

    const translateConfig = {
      [Model.GLM]: translateTextGLMEnglishChineseTranslation,
      [Model.GEMINI]: translateTextGeminiEnglishChineseTranslation,
      [Model.GPT]: translateTextGPTEnglishChineseTranslation,
      [Model.DEEP_SEEK]: translateTextDeepSeekEnglishChineseTranslation
    }
    const translateFunction = translateConfig[getModelType(this.currentTranslationModelName)]
    const translateResult = await translateFunction(this.currentTranslationModelName, apiKey, text)
    return translateResult
  }
}

const aiManage = new AiManage()
export { aiManage }
