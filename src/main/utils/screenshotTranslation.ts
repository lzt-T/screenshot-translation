import { aiManage } from "./aiManage"
import { showNotification } from "./notification"
import { NoticeType } from "../../type/notice"
import { screenshotWindow } from "../windowClasses/screenshotWindow"
import { mainWindow } from "../windowClasses/mainWindow"
import { resultWindow } from "../windowClasses/resultWindow"
import { captureArea } from "./captureArea"
import { analyzeScreenshot } from "./imageAnalyzer"
import { getErrorMessage } from "./error"
import { Language } from "../../type/base"


/** 管理截图选择与翻译流程 */
class ScreenshotTranslationManager {

  /* 当前目标语言 */
  public targetLanguage: Language = Language.ZH

  /** 创建截图翻译管理器 */
  constructor() { }

  /**
   * @description 设置当前目标语言
   * @param {Language} targetLanguage 目标语言
   */
  public setTargetLanguage(targetLanguage: Language) {
    this.targetLanguage = targetLanguage
  }

  /**
   * @description 开始截图
   */
  public async startScreenshot(): Promise<void> {
    // 当前模型 API Key
    const apiKey = aiManage.getApiKey()
    // 当前模型显示名称
    const currentModelText = aiManage.getCurrentModelDisplayText()

    if (!apiKey) {
      showNotification(
        `模型 ${currentModelText} 的 API Key 未配置，请前往设置完成配置后重试`,
        NoticeType.ERROR
      )
      return
    }

    if (screenshotWindow.isScreenshotting) {
      showNotification('正在翻译中...', NoticeType.WARNING)
      return
    }
    screenshotWindow.changeScreenshottingState(true)

    if (resultWindow.window && !resultWindow.window.isDestroyed()) {
      try {
        resultWindow.window.close()
      } catch (e) { }
      resultWindow.window = null
    }

    try {
      await screenshotWindow.createWindow()

      // 当前可用的主窗口
      const activeMainWindow = mainWindow.window
      if (
        activeMainWindow &&
        !activeMainWindow.isDestroyed() &&
        activeMainWindow.isVisible() &&
        !activeMainWindow.isMinimized()
      ) {
        activeMainWindow.minimize()
      }
      screenshotWindow.activateWindow()
    } catch (error) {
      screenshotWindow.cancelScreenshot()

      // 截图失败后需要恢复的主窗口
      const activeMainWindow = mainWindow.window
      if (activeMainWindow && !activeMainWindow.isDestroyed()) {
        if (activeMainWindow.isMinimized()) {
          activeMainWindow.restore()
        }
        activeMainWindow.show()
        activeMainWindow.focus()
      }

      // 可展示的截图启动错误
      const errorMessage = getErrorMessage(error)
      console.error('截图窗口启动失败:', error)
      showNotification(`截图启动失败: ${errorMessage}`, NoticeType.ERROR)
    }
  }

  /**
   * @description 开始翻译
   */
  public async startTranslation() {
    if (!screenshotWindow.lastBounds) return

    showNotification('翻译中...', NoticeType.INFO, true)

    try {
      // 选区截图数据
      const imageData = await captureArea(screenshotWindow.lastBounds)

      // 截图分析与翻译结果
      const analysisResult = await analyzeScreenshot(imageData, this.targetLanguage)

      if (analysisResult && analysisResult.success) {
        resultWindow.setResultData(analysisResult)
        resultWindow.createWindow()
      } else if (analysisResult && !analysisResult.success) {
        showNotification(`分析失败: ${analysisResult.msg || '未知错误'}`, NoticeType.ERROR)
      }
    } catch (error) {
      // 可展示的截图分析错误
      const errorMessage = getErrorMessage(error)
      showNotification(`分析失败: ${errorMessage}`, NoticeType.ERROR)
    } finally {
      screenshotWindow.setBounds(null)
      screenshotWindow.changeScreenshottingState(false)
    }
  }
}


// 全局截图翻译管理器
export const screenshotTranslationManager = new ScreenshotTranslationManager()
