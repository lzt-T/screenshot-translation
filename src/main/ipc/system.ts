import { ipcMain, shell } from 'electron'
import { SendEnum } from '../../type/ipc-constants'
import { showNotification } from '../utils/notification'
import { NoticeType } from '../../type/notice'
import { aiManage } from '../utils/aiManage'
import { screenshotTranslationManager } from '../utils/screenshotTranslation'
import { setAutoLaunch } from '../utils/system'
import { ModelConnectionTestResult, TranslationModelProfile } from '../../type/model'
import { validateModelProfile } from '../../utils/modelProfiles'
import { langchainGateway } from '../utils/aiClients/langchainGateway'
import { getErrorMessage } from '../utils/error'

// 连接测试使用的最小提示词
const MODEL_CONNECTION_TEST_PROMPT = '请只回复 OK'

/**
 * 注册系统相关 IPC 事件
 * @returns {void} 无返回值
 */
export const registerSystemIpcEvents = () => {
  /** 复制文本成功 */
  ipcMain.on(SendEnum.COPY_TEXT_SUCCESS, () => {
    showNotification('复制成功', NoticeType.SUCCESS, true)
  })

  /** 设置localForage */
  ipcMain.on(SendEnum.SET_LOCAL_FORAGE, (event, setting) => {
    aiManage.setModelSettings(setting.activeModelId, setting.models)
    screenshotTranslationManager.setTargetLanguage(setting.targetLanguage)
    aiManage.initAiClient()
  })

  /** 初始化localForage */
  ipcMain.on(SendEnum.INIT_LOCAL_FORAGE, (event, setting) => {
    aiManage.setModelSettings(setting.activeModelId, setting.models)
    screenshotTranslationManager.setTargetLanguage(setting.targetLanguage)
    aiManage.initAiClient()
  })

  /** 单独设置开机自启动 */
  ipcMain.on(SendEnum.SET_AUTO_LAUNCH, (event, enabled) => {
    setAutoLaunch(enabled)
  })

  /** 测试自定义模型连接 */
  ipcMain.handle(
    SendEnum.TEST_MODEL_CONNECTION,
    async (_event, profile: TranslationModelProfile): Promise<ModelConnectionTestResult> => {
      // 模型配置校验结果
      const validation = validateModelProfile(profile)
      if (!validation.isValid) {
        // 首个字段错误
        const firstError = Object.values(validation.errors).find(Boolean)
        return {
          success: false,
          message: firstError || '模型配置不完整'
        }
      }

      try {
        await langchainGateway.invoke(profile, MODEL_CONNECTION_TEST_PROMPT)
        return {
          success: true,
          message: '连接测试成功'
        }
      } catch (error) {
        // 原始错误信息
        const errorMessage = getErrorMessage(error)
        // 移除错误中可能包含的 API Key
        const safeErrorMessage = profile.apiKey
          ? errorMessage.replaceAll(profile.apiKey, '***')
          : errorMessage
        return {
          success: false,
          message: safeErrorMessage
        }
      }
    }
  )

  /** 打开外部链接 */
  ipcMain.on(SendEnum.OPEN_EXTERNAL_URL, (event, url) => {
    shell.openExternal(url)
  })
}
