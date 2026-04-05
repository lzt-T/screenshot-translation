import { Language } from '../../type/base'
import { getTranslatePrompt } from '../../utils/ai'
import { promptManage } from '../../utils/promptManage'
import { TranslationModelProfile } from '../../type/model'
import { createDefaultModelProfiles, DEFAULT_ACTIVE_MODEL_ID } from '../../utils/modelProfiles'
import { langchainGateway } from './aiClients/langchainGateway'

/** 翻译结果类型 */
type TranslationResult = {
  /* 调用是否成功 */
  success: boolean;
  /* 翻译结果文本 */
  translation: string;
  /* 结果提示 */
  msg?: string;
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
  public currentTranslationModelName: string = 'glm-4-flash-250414-free'

  constructor() {}

  /**
   * 设置模型配置
   * @param {string} activeModelId 当前激活模型 ID
   * @param {TranslationModelProfile[]} models 模型配置列表
   * @returns {void} 无返回值
   */
  public setModelSettings(activeModelId: string, models: TranslationModelProfile[]) {
    // 是否有可用模型配置
    const hasValidModels = Array.isArray(models) && models.length > 0
    this.currentModels = hasValidModels ? models : createDefaultModelProfiles()

    // 当前可用的激活模型
    const activeProfile = this.currentModels.find((item) => item.id === activeModelId)
      || this.currentModels[0]
    this.currentActiveModelId = activeProfile?.id || DEFAULT_ACTIVE_MODEL_ID
    this.currentTranslationModelName = activeProfile?.model || 'unknown-model'
  }

  /**
   * 获取当前模型配置
   * @returns {TranslationModelProfile | null} 当前模型配置
   */
  private getCurrentModelProfile(): TranslationModelProfile | null {
    // 匹配当前激活模型
    const activeProfile = this.currentModels.find((item) => item.id === this.currentActiveModelId)
      || this.currentModels[0]
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
   * @returns {Promise<TranslationResult>} 翻译结果
   */
  public async translateText(text: string, targetLanguage: Language): Promise<TranslationResult> {
    // 运行时模型配置
    const runtimeProfile = this.getRuntimeModelProfile()
    if (!runtimeProfile) {
      return {
        success: false,
        translation: '',
        msg: '未找到可用模型配置'
      }
    }

    // 当前模型 API Key
    const apiKey = runtimeProfile.apiKey
    if (!apiKey) {
      return {
        success: false,
        translation: '',
        msg: `${runtimeProfile.model} 模型的 API Key 未配置`
      }
    }

    // 翻译提示词
    const prompt = `${getTranslatePrompt(text, targetLanguage)}`
    // 模型调用结果
    const invokeResult = await langchainGateway.invoke(runtimeProfile, prompt)

    return {
      success: invokeResult.success,
      translation: invokeResult.text,
      msg: invokeResult.msg
    }
  }

  /**
   * 英汉互译
   * @param {string} text 待翻译文本
   * @returns {Promise<TranslationResult>} 翻译结果
   */
  public async englishChineseTranslation(text: string): Promise<TranslationResult> {
    // 运行时模型配置
    const runtimeProfile = this.getRuntimeModelProfile()
    if (!runtimeProfile) {
      return {
        success: false,
        translation: '',
        msg: '未找到可用模型配置'
      }
    }

    // 当前模型 API Key
    const apiKey = runtimeProfile.apiKey
    if (!apiKey) {
      return {
        success: false,
        translation: '',
        msg: `${runtimeProfile.model} 模型的 API Key 未配置`
      }
    }

    // 英汉互译提示词
    const prompt = `${promptManage.getTranslatePrompt(text)}`
    // 模型调用结果
    const invokeResult = await langchainGateway.invoke(runtimeProfile, prompt)
    return {
      success: invokeResult.success,
      translation: invokeResult.text,
      msg: invokeResult.msg
    }
  }
}

export const aiManage = new AiManage()
