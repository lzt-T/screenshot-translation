import { ipcMain } from "electron"
import { SendEnum } from "../../type/ipc-constants"
import { screenshotTranslationManager } from "../utils/screenshotTranslation"
import { screenshotWindow } from "../windowClasses/screenshotWindow"
import { resultWindow } from "../windowClasses/resultWindow"

/** 注册截图相关的主进程事件 */
export const registerScreenshotIpcEvents = () => {

  /** 开始截图 */
  ipcMain.on(SendEnum.SCREENSHOT_START, () => {
    screenshotTranslationManager.startScreenshot()
  })

  /** 截图区域选择完成 */
  ipcMain.on(SendEnum.SCREENSHOT_SELECTED, async (event, bounds) => {
    if (!screenshotWindow.isScreenshotting) {
      return
    }
    screenshotWindow.setBounds(bounds) // 存储边界用于分析
    await screenshotWindow.closeWindow()
    await screenshotTranslationManager.startTranslation()
  })

  /** 关闭截图窗口 */
  ipcMain.on(SendEnum.SCREENSHOT_CANCEL, () => {
    screenshotWindow.cancelScreenshot()
  })

  /** 关闭结果窗口 */
  ipcMain.on(SendEnum.RESULT_WINDOW_CLOSE, () => {
    if (resultWindow) {
      resultWindow.closeWindow()
    }
  })
}
