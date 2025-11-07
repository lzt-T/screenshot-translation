import { aiManage } from "./aiManage"
import { showNotification } from "./notification"
import { NoticeType } from "../../type/notice"
import { screenshotWindow } from "../windowClasses/screenshotWindow"
import { mainWindow } from "../windowClasses/mainWindow"
import { resultWindow } from "../windowClasses/resultWindow"
import { captureArea } from "./captureArea"
import { analyzeScreenshot } from "./imageAnalyzer"
import { getErrorMessage } from "./error"
import { TargetLanguage } from "../../type/model"


class ScreenshotTranslationManager {

  /* 当前目标语言 */
  public targetLanguage: TargetLanguage = TargetLanguage.ZH_CN

  constructor() { }

  /**
   * @description 设置当前目标语言
   * @param {TargetLanguage} targetLanguage 目标语言
   */
  public setTargetLanguage(targetLanguage: TargetLanguage) {
    this.targetLanguage = targetLanguage
  }

  /**
   * @description 开始截图
   */
  public startScreenshot() {
    const apiKey = aiManage.getApiKey()

    if (!apiKey) {
      showNotification(
        `模型 ${aiManage.currentTranslationModelName} 的 API Key 未配置,请在设置中配置`,
        NoticeType.ERROR
      )
      return
    }

    if (screenshotWindow.isScreenshotting) {
      showNotification('正在翻译中...', NoticeType.WARNING)
      return
    }
    screenshotWindow.changeScreenshottingState(true)

    // 仅当主窗口可见且未最小化时才最小化
    if (
      mainWindow &&
      !mainWindow.window?.isDestroyed() &&
      mainWindow.window?.isVisible() &&
      !mainWindow.window?.isMinimized()
    ) {
      mainWindow.window?.minimize()
    }

    if (resultWindow.window && !resultWindow.window.isDestroyed()) {
      try {
        resultWindow.window.close()
      } catch (e) { }
      resultWindow.window = null
    }

    screenshotWindow.createWindow()
  }

  /**
   * @description 开始翻译
   */
  public async startTranslation() {
    if (!screenshotWindow.lastBounds) return

    showNotification('翻译中...', NoticeType.INFO, true)

    try {
      const imageData = await captureArea(screenshotWindow.lastBounds)

      const analysisResult = await analyzeScreenshot(imageData, this.targetLanguage)

      if (analysisResult && analysisResult.success) {
        resultWindow.setResultData(analysisResult)
        resultWindow.createWindow()
      } else if (analysisResult && !analysisResult.success) {
        showNotification(`分析失败: ${analysisResult.msg || '未知错误'}`, NoticeType.ERROR)
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      showNotification(`分析失败: ${errorMessage}`, NoticeType.ERROR)
    } finally {
      screenshotWindow.setBounds(null)
      screenshotWindow.changeScreenshottingState(false)
    }
  }
}


export const screenshotTranslationManager = new ScreenshotTranslationManager()


