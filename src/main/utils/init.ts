import { globalShortcut } from 'electron'
import { mainWindow } from '../windowClasses/mainWindow'
import { SendEnum } from '../../type/ipc-constants'
import { showNotification } from './notification'
import { NoticeType } from '../../type/notice'
import { screenshotTranslationManager } from './screenshotTranslation'
import { registerSystemIpcEvents } from '../ipc/system'
import { registerScreenshotIpcEvents } from '../ipc/screenshot'
import { registerTranslationIpcEvents } from '../ipc/translation'
import { initializeOcrWorker } from './imageOCR'
import { registerSpeechIpcEvents } from '../ipc/speech'
import { registerConversationIpcEvents } from '../ipc/conversation'
import { registerRecognitionIpcEvents } from '../ipc/recognition'
import { registerLearningIpcEvents } from '../ipc/learning'

export const init = () => {
  /**
   * 注册快捷键
   */
  let shortcutF2 = globalShortcut.register('F2', () => {
    screenshotTranslationManager.startScreenshot()
  })
  if (!shortcutF2) {
    showNotification('F2快捷键冲突', NoticeType.ERROR)
  }

  /* 注册快捷键ctrl+r */
  let shortcutCtrlR = globalShortcut.register('ctrl+r', () => {
    if (mainWindow.window) {
      mainWindow.window.webContents.send(SendEnum.SWAP_CONTENT, null)
    }
  })
  if (!shortcutCtrlR) {
    showNotification('ctrl+r快捷键冲突', NoticeType.ERROR)
  }

  registerSystemIpcEvents()
  registerScreenshotIpcEvents()
  registerTranslationIpcEvents()
  registerSpeechIpcEvents()
  registerConversationIpcEvents()
  registerRecognitionIpcEvents()
  registerLearningIpcEvents()

  // 预热 OCR Worker，降低首次截图耗时
  void initializeOcrWorker().catch((error) => {
    // OCR 初始化错误文本
    const errorText = error instanceof Error ? error.message : String(error)
    showNotification(errorText, NoticeType.WARNING)
  })
}
