import { ipcMain } from "electron"
import { SendEnum } from "../../type/ipc-constants"
import { aiManage } from "../utils/aiManage"
import { getErrorMessage } from "../utils/error"

export const registerTranslationIpcEvents = () => {

  /** 英汉互译 */
  ipcMain.on(SendEnum.ENGLISH_CHINESE_TRANSLATION, async (event, text) => {
    try {
      const translateResult = await aiManage.englishChineseTranslation(text)
      if (!translateResult.success) {
        throw new Error(translateResult.msg || '英汉互译失败')
      }
      event.reply(SendEnum.ENGLISH_CHINESE_TRANSLATION_SUCCESS, translateResult.translation)
    } catch (error) {
      event.reply(SendEnum.ENGLISH_CHINESE_TRANSLATION_FAIL, getErrorMessage(error))
    }
  })

}
