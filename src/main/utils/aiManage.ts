import { Language } from '../../type/base'
import {
  getTextType,
  getTranslatePrompt,
  getScreenshotBlocksTranslatePrompt,
  ScreenshotTranslationPromptItem
} from '../../utils/ai'
import { promptManage } from '../../utils/promptManage'
import { BUILTIN_FREE_MODEL, TranslationModelProfile } from '../../type/model'
import { createDefaultModelProfiles, DEFAULT_ACTIVE_MODEL_ID } from '../../utils/modelProfiles'
import { langchainGateway } from './aiClients/langchainGateway'
import {
  type EnglishChineseTranslation,
  type ScreenshotTranslation,
  type TextTranslation,
  englishChineseTranslationSchemaMap,
  screenshotTranslationSchema,
  textTranslationSchema
} from './aiClients/translationSchemas'
import { log } from 'node:console'

/** 结构化翻译结果类型 */
type TranslationResult<TData> = {
  /* 调用是否成功 */
  success: boolean
  /* 结构化翻译数据 */
  data: TData | null
  /* 结果提示 */
  msg?: string
}

/**
 * AI 调度管理器
 */
class AiManage {
  // 当前模型配置列表
  public currentModels: TranslationModelProfile[] = createDefaultModelProfiles()

  // 当前激活模型 ID
  public currentActiveModelId: string = DEFAULT_ACTIVE_MODEL_ID

  // 当前翻译模型名称
  public currentTranslationModelName: string = BUILTIN_FREE_MODEL

  /** 初始化 AI 调度管理器 */
  constructor() {}

  /**
   * 是否是结构化输出校验失败
   * @param {unknown} error 错误对象
   * @returns {boolean} 是否是结构化校验失败
   */
  private isStructuredOutputValidationError(error: unknown): boolean {
    // 错误消息
    const errorMessage = error instanceof Error ? error.message : String(error)
    return errorMessage.includes('parseError=true')
  }

  /**
   * 构建结构化失败结果
   * @returns {TranslationResult<TData>} 翻译失败结果
   */
  private createStructuredFailResult<TData>(): TranslationResult<TData> {
    return {
      success: false,
      data: null,
      msg: '模型输出不符合 JSON 结构要求'
    }
  }

  /**
   * 设置模型配置
   * @param {string} activeModelId 当前激活模型 ID
   * @param {TranslationModelProfile[]} models 模型配置列表
   * @returns {void} 无返回值
   */
  public setModelSettings(activeModelId: string, models: TranslationModelProfile[]) {
    // 是否有可用模型配置
    const hasValidModels = Array.isArray(models) && models.length > 0
    // 当前可用模型配置
    const availableModels = hasValidModels ? models : createDefaultModelProfiles()
    this.currentModels = availableModels.map((modelProfile) => {
      return modelProfile.isBuiltInFree
        ? { ...modelProfile, model: BUILTIN_FREE_MODEL }
        : modelProfile
    })

    // 当前可用的激活模型
    const activeProfile =
      this.currentModels.find((item) => item.id === activeModelId) || this.currentModels[0]
    this.currentActiveModelId = activeProfile?.id || DEFAULT_ACTIVE_MODEL_ID
    this.currentTranslationModelName = activeProfile?.model || 'unknown-model'
  }

  /**
   * 获取当前模型配置
   * @returns {TranslationModelProfile | null} 当前模型配置
   */
  private getCurrentModelProfile(): TranslationModelProfile | null {
    // 匹配当前激活模型
    const activeProfile =
      this.currentModels.find((item) => item.id === this.currentActiveModelId) ||
      this.currentModels[0]
    return activeProfile || null
  }

  /**
   * 获取运行时可调用模型配置
   * @returns {TranslationModelProfile | null} 运行时配置
   */
  private getRuntimeModelProfile(): TranslationModelProfile | null {
    // 当前模型配置
    const profile = this.getCurrentModelProfile()
    if (!profile) {
      return null
    }

    // 运行时 API Key
    const runtimeApiKey = profile.isBuiltInFree
      ? import.meta.env.MAIN_VITE_GML_FREE_API_KEY
      : profile.apiKey

    return {
      ...profile,
      apiKey: runtimeApiKey
    }
  }

  /**
   * 获取当前激活模型 API Key
   * @returns {string} API Key
   */
  public getApiKey() {
    // 运行时模型配置
    const runtimeProfile = this.getRuntimeModelProfile()
    return runtimeProfile?.apiKey || ''
  }

  /**
   * 获取当前模型显示文本
   * @returns {string} 当前模型显示文本
   */
  public getCurrentModelDisplayText(): string {
    // 当前模型配置
    const profile = this.getCurrentModelProfile()
    if (!profile) {
      return 'unknown-model'
    }

    // 当前模型展示名
    const modelDisplayText = profile.displayName || profile.model
    return modelDisplayText
  }

  /**
   * 兼容旧调用的初始化入口
   * @returns {void} 无返回值
   */
  public initAiClient() {
    // LangChain 网关按需实例化，初始化阶段无需预热。
  }

  /**
   * 文字翻译
   * @param {string} text 待翻译文本
   * @param {Language} targetLanguage 目标语言
   * @returns {Promise<TranslationResult<TextTranslation>>} 翻译结果
   */
  public async translateText(
    text: string,
    targetLanguage: Language
  ): Promise<TranslationResult<TextTranslation>> {
    // 运行时模型配置
    const runtimeProfile = this.getRuntimeModelProfile()
    if (!runtimeProfile) {
      return {
        success: false,
        data: null,
        msg: '未找到可用模型配置'
      }
    }

    // 当前模型 API Key
    const apiKey = runtimeProfile.apiKey
    if (!apiKey) {
      return {
        success: false,
        data: null,
        msg: `${runtimeProfile.model} 模型的 API Key 未配置`
      }
    }

    try {
      // 翻译提示词
      const prompt = `${getTranslatePrompt(text, targetLanguage)}`
      // 模型调用结果
      const invokeResult = await langchainGateway.invokeStructured(
        runtimeProfile,
        prompt,
        textTranslationSchema
      )

      console.log(invokeResult, 'invokeResult')

      return {
        success: invokeResult.success,
        data: invokeResult.data,
        msg: invokeResult.msg
      }
    } catch (error) {
      if (this.isStructuredOutputValidationError(error)) {
        return this.createStructuredFailResult()
      }
      throw error
    }
  }

  /**
   * 截图文本块批量翻译
   * @param {ScreenshotTranslationPromptItem[]} items 截图文本块
   * @param {Language} targetLanguage 目标语言
   * @returns {Promise<TranslationResult<ScreenshotTranslation>>} 翻译结果
   */
  public async translateScreenshotBlocks(
    items: ScreenshotTranslationPromptItem[],
    targetLanguage: Language
  ): Promise<TranslationResult<ScreenshotTranslation>> {
    // 运行时模型配置
    const runtimeProfile = this.getRuntimeModelProfile()
    if (!runtimeProfile) {
      return {
        success: false,
        data: null,
        msg: '未找到可用模型配置'
      }
    }

    // 当前模型 API Key
    const apiKey = runtimeProfile.apiKey
    if (!apiKey) {
      return {
        success: false,
        data: null,
        msg: `${runtimeProfile.model} 模型的 API Key 未配置`
      }
    }

    try {
      // 截图翻译提示词
      const prompt = `${getScreenshotBlocksTranslatePrompt(items, targetLanguage)}`
      // 模型调用结果
      const invokeResult = await langchainGateway.invokeStructured(
        runtimeProfile,
        prompt,
        screenshotTranslationSchema
      )

      // 返回项映射
      const responseItemMap = new Map(
        invokeResult.data.items.map((item) => [item.id, item.translation])
      )
      // 回填后的结果
      const normalizedItems = items.map((item) => ({
        id: item.id,
        translation: responseItemMap.get(item.id) || item.text
      }))

      return {
        success: invokeResult.success,
        data: { items: normalizedItems },
        msg: invokeResult.msg
      }
    } catch (error) {
      if (this.isStructuredOutputValidationError(error)) {
        return this.createStructuredFailResult()
      }
      throw error
    }
  }

  /**
   * 英汉互译
   * @param {string} text 待翻译文本
   * @returns {Promise<TranslationResult<EnglishChineseTranslation>>} 翻译结果
   */
  public async englishChineseTranslation(
    text: string
  ): Promise<TranslationResult<EnglishChineseTranslation>> {
    // 运行时模型配置
    const runtimeProfile = this.getRuntimeModelProfile()
    if (!runtimeProfile) {
      return {
        success: false,
        data: null,
        msg: '未找到可用模型配置'
      }
    }

    // 当前模型 API Key
    const apiKey = runtimeProfile.apiKey
    if (!apiKey) {
      return {
        success: false,
        data: null,
        msg: `${runtimeProfile.model} 模型的 API Key 未配置`
      }
    }

    try {
      // 待翻译文本类型
      const textType = getTextType(text)
      // 英汉互译提示词
      const prompt = `${promptManage.getTranslatePrompt(text)}`
      // 当前文本类型对应的结构
      const schema = englishChineseTranslationSchemaMap[textType]
      // 模型调用结果
      const invokeResult = await langchainGateway.invokeStructured<EnglishChineseTranslation>(
        runtimeProfile,
        prompt,
        schema
      )

      console.log(invokeResult, 'invokeResult')

      return {
        success: invokeResult.success,
        data: invokeResult.data,
        msg: invokeResult.msg
      }
    } catch (error) {
      console.error(error, 'error')
      if (this.isStructuredOutputValidationError(error)) {
        return this.createStructuredFailResult()
      }
      throw error
    }
  }
}

// AI 调度管理器实例
export const aiManage = new AiManage()
