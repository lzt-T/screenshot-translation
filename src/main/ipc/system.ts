import { ipcMain, shell } from "electron"
import { SendEnum } from "../../type/ipc-constants"
import { showNotification } from "../utils/notification"
import { NoticeType } from "../../type/notice"
import { aiManage } from "../utils/aiManage"
import { screenshotTranslationManager } from "../utils/screenshotTranslation"
import { setAutoLaunch } from "../utils/system"

export const registerSystemIpcEvents = () => {
  /** 复制文本成功 */
  ipcMain.on(SendEnum.COPY_TEXT_SUCCESS, () => {
    showNotification('复制成功', NoticeType.SUCCESS, true)
  })

  /** 设置localForage */
  ipcMain.on(SendEnum.SET_LOCAL_FORAGE, (event, setting) => {
    aiManage.setCurrentTranslationModelName(setting.activeModel)
    aiManage.setCurrentApiKeys(setting.apiKeys)
    screenshotTranslationManager.setTargetLanguage(setting.targetLanguage)
    aiManage.initAiClient()
  })

  /** 初始化localForage */
  ipcMain.on(SendEnum.INIT_LOCAL_FORAGE, (event, setting) => {
    aiManage.setCurrentTranslationModelName(setting.activeModel)
    aiManage.setCurrentApiKeys(setting.apiKeys)
    screenshotTranslationManager.setTargetLanguage(setting.targetLanguage)
    aiManage.initAiClient()
  })

  /** 单独设置开机自启动 */
  ipcMain.on(SendEnum.SET_AUTO_LAUNCH, (event, enabled) => {
    setAutoLaunch(enabled)
  })

  /** 打开外部链接 */
  ipcMain.on(SendEnum.OPEN_EXTERNAL_URL, (event, url) => {
    shell.openExternal(url)
  })
}


