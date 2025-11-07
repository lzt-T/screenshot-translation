import { ipcMain } from "electron"
import { SendEnum } from "../../type/ipc-constants"
import { screenshotTranslationManager } from "../utils/screenshotTranslation"
import { screenshotWindow } from "../windowClasses/screenshotWindow"
import { resultWindow } from "../windowClasses/resultWindow"

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
    screenshotTranslationManager.startTranslation()
    screenshotWindow.closeWindow()
  })

  /** 关闭截图窗口 */
  ipcMain.on(SendEnum.SCREENSHOT_CANCEL, () => {
    if (screenshotWindow.window) {
      screenshotWindow.window.close()
      screenshotWindow.changeScreenshottingState(false)
    }
  })

  /** 关闭结果窗口 */
  ipcMain.on(SendEnum.RESULT_WINDOW_CLOSE, () => {
    if (resultWindow) {
      resultWindow.closeWindow()
    }
  })

  /** 停止监听鼠标位置变化 */
  ipcMain.on(SendEnum.START_SCREENSHOT, () => {
    screenshotWindow.stopListenMousePositionChange()
  })
}
