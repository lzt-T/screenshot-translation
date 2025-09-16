import { app, shell, BrowserWindow, ipcMain, globalShortcut, screen, Notification } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { SendEnum } from '../type/ipc-constants'
import { captureArea } from './utils/captureArea'
import { analyzeScreenshot, TranslateTextBlock } from './utils/imageAnalyzer'
import { Model, GeminiModel, TargetLanguage, GlmModel } from '../type/model'
import { NoticeType } from '../type/notice'
import { getErrorMessage } from './utils/error'
import { getModelType } from '../utils/ai'
import { getConfig } from '../utils/config'
import { setAiClient } from './utils/ai'
import { EnglishChineseTranslation } from './utils/EnglishChineseTranslation'
import { showNotification } from './utils/notification'
import AutoLaunch from 'auto-launch'
import { registerAutoUpdate } from './update'
import dotenv from 'dotenv'

const { MIN_RESULT_WINDOW_WIDTH, MIN_RESULT_WINDOW_HEIGHT,
  RESULT_WINDOW_BAR_HEIGHT,
} = getConfig()

let mainWindow: BrowserWindow | null = null
let screenshotWindow: BrowserWindow | null = null
let resultWindow: BrowserWindow | null = null
let isScreenshotting = false
let lastBounds = null
/** 当前目标语言 */
let currentTargetLanguage = TargetLanguage.ZH_CN
/** 当前翻译模型 */
let currentTranslationModel = GlmModel.GLM_4_FLASH_250414_FREE
/** 当前API Key */
let currentApiKeys: {
  [Model.GEMINI]: string,
  [Model.GLM]: string,
  [Model.GPT]: string,
  [Model.DEEP_SEEK]: string
} = {
  [Model.GEMINI]: '',
  [Model.GLM]: '',
  [Model.GPT]: '',
  [Model.DEEP_SEEK]: ''
}

// 检查是否是第一个实例
const gotTheLock = app.requestSingleInstanceLock()

// 如果不是第一个实例，退出应用
if (!gotTheLock) {
  app.quit()
} else {
  // 如果是第一个实例，监听第二个实例的启动
  app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
    // 如果主窗口存在，显示并激活它
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      mainWindow.show()
      mainWindow.focus()
    }
  })

  // 创建自启动实例
  const autoLauncher = new AutoLaunch({
    name: 'Bai_Ze',
    path: process.execPath,
    isHidden: false
  });

  const iconPath = is.dev
    ? join(__dirname, '../../resources/icon.png')
    : join(process.resourcesPath, 'resources/icon.png')

  /**
   * 创建截图窗口
   */
  function createScreenshotWindow() {
    if (screenshotWindow && !screenshotWindow.isDestroyed()) {
      screenshotWindow.focus()
      return
    }

    const { width, height } = screen.getPrimaryDisplay().workAreaSize

    screenshotWindow = new BrowserWindow({
      width,
      height,
      frame: false,
      transparent: true,
      fullscreen: true,
      resizable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      icon: iconPath,
      webPreferences: {
        contextIsolation: true,
        preload: join(__dirname, '../preload/index.js')
      }
    })
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      screenshotWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/windows/screenshotSelector`)
    } else {
      screenshotWindow.loadFile(
        join(__dirname, '../renderer/src/windows/screenshotSelector/index.html')
      )
    }

    screenshotWindow.on('closed', () => {
      if (isScreenshotting) {
        isScreenshotting = false
        // 确保在窗口关闭后执行分析
        handleScreenshotAnalysis()
      }
      screenshotWindow = null
    })
  }

  // 截图启动逻辑
  function initiateScreenshotSequence() {
    const apiKey = currentTranslationModel === GlmModel.GLM_4_FLASH_250414_FREE
      ? dotenv.config().parsed?.GML_FREE_API_KEY
      : currentApiKeys[getModelType(currentTranslationModel)]

    if (!apiKey) {
      showNotification(
        `模型 ${currentTranslationModel} 的 API Key 未配置,请在设置中配置`,
        NoticeType.ERROR
      )
      return
    }

    if (isScreenshotting) {
      return false
    }
    isScreenshotting = true

    // 仅当主窗口可见且未最小化时才最小化
    if (
      mainWindow &&
      !mainWindow.isDestroyed() &&
      mainWindow.isVisible() &&
      !mainWindow.isMinimized()
    ) {
      mainWindow.minimize()
    }

    if (resultWindow && !resultWindow.isDestroyed()) {
      try {
        resultWindow.close()
      } catch (e) { }
      resultWindow = null
    }

    createScreenshotWindow() // 创建选择窗口
    return true
  }

  /**
   * 截图后的分析处理
   */
  async function handleScreenshotAnalysis() {
    if (!lastBounds) return

    showNotification('翻译中...', NoticeType.INFO, true)

    try {
      const imageData = await captureArea(lastBounds)
      const apiKey = currentTranslationModel === GlmModel.GLM_4_FLASH_250414_FREE
        ? dotenv.config().parsed?.GML_FREE_API_KEY
        : currentApiKeys[getModelType(currentTranslationModel)]
      const analysisResult = await analyzeScreenshot(imageData, currentTranslationModel, apiKey as string, currentTargetLanguage)

      if (analysisResult && analysisResult.success) {
        await createResultWindow(analysisResult, lastBounds)
      } else if (analysisResult && !analysisResult.success) {
        showNotification(`分析失败: ${analysisResult.msg || '未知错误'}`, NoticeType.ERROR)
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      showNotification(`分析失败: ${errorMessage}`, NoticeType.ERROR)
    } finally {
      lastBounds = null
    }
  }

  /**
   * 创建结果窗口
   */
  async function createResultWindow(resultData, boundsData) {
    resultWindow = new BrowserWindow({
      x: Math.round(boundsData.x),
      y: Math.round(boundsData.y),
      width: Math.max(Math.round(boundsData.width), MIN_RESULT_WINDOW_WIDTH),
      height: Math.max(Math.round(boundsData.height + RESULT_WINDOW_BAR_HEIGHT), MIN_RESULT_WINDOW_HEIGHT),
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      resizable: false,
      movable: true,
      skipTaskbar: true,
      focusable: true,
      show: false,
      icon: iconPath,
      webPreferences: {
        contextIsolation: true,
        preload: join(__dirname, '../preload/index.js')
      }
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      resultWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/windows/resultOverlay`)
    } else {
      resultWindow.loadFile(join(__dirname, '../renderer/src/windows/resultOverlay/index.html'))
    }

    resultWindow.webContents.on('did-finish-load', () => {
      if (resultWindow && !resultWindow.isDestroyed()) {
        resultWindow.show()
      }

    })

    resultWindow.webContents.once('dom-ready', () => {
      if (resultWindow && !resultWindow.isDestroyed()) {
        resultWindow.webContents.send(SendEnum.DISPLAY_TRANSLATION_RESULT, {
          result: resultData,
          bounds: boundsData
        })
      }
    })

    resultWindow.on('closed', () => {
      resultWindow = null
    })
  }

  /**
   * 创建主窗口
   */
  function createWindow(): void {
    mainWindow = new BrowserWindow({
      width: 900,
      height: 670,
      show: false,
      autoHideMenuBar: true,
      title: 'Bai_Ze',
      icon: iconPath,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false
      }
    })

    mainWindow.on('ready-to-show', () => {
      if (mainWindow) {
        mainWindow.show()
      }
    })

    mainWindow.on('closed', () => {
      mainWindow = null
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }

    registerAutoUpdate(mainWindow)
  }

  /**
   * 设置开机自启动
   * @param enabled 是否启用
   */
  function setAutoLaunch(enabled: boolean): void {
    try {
      if (enabled) {
        autoLauncher.enable()
          .then(() => {
            return autoLauncher.isEnabled();
          })
          .then((isEnabled) => {
            if (!isEnabled) {
              showNotification('开机自启动设置可能未生效', NoticeType.WARNING);
            }
          })
          .catch((_err) => {
            showNotification('启用开机自启动失败', NoticeType.ERROR);
          });
      } else {
        autoLauncher.disable()
          .then(() => {
          })
          .catch((_err) => {
            showNotification('禁用开机自启动失败', NoticeType.ERROR);
          });
      }
    } catch (error) {
      showNotification('设置开机自启动失败', NoticeType.ERROR);
    }
  }

  app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.electron.app')
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    createWindow()

    ipcMain.on(SendEnum.SCREENSHOT_START, () => {
      initiateScreenshotSequence()
    })

    // 截图区域选择完成监听器
    ipcMain.on(SendEnum.SCREENSHOT_SELECTED, async (event, bounds) => {
      if (!isScreenshotting) {
        return
      }

      lastBounds = bounds // 存储边界用于分析

      // 立即关闭选择窗口
      if (screenshotWindow && !screenshotWindow.isDestroyed()) {
        try {
          screenshotWindow.close()
        } catch (e) { }
      }
    })

    /** 关闭截图窗口 */
    ipcMain.on(SendEnum.SCREENSHOT_CANCEL, () => {
      if (screenshotWindow) {
        screenshotWindow.close()
      }
    })

    /** 关闭结果窗口 */
    ipcMain.on(SendEnum.RESULT_WINDOW_CLOSE, () => {
      if (resultWindow) {
        resultWindow.close()
      }
    })

    /** 关闭通知 */
    ipcMain.on(SendEnum.CLOSE_NOTIFICATION, () => {
    })

    /** 复制文本成功 */
    ipcMain.on(SendEnum.COPY_TEXT_SUCCESS, () => {
      showNotification('复制成功', NoticeType.SUCCESS, true)
    })

    /** 英汉互译 */
    ipcMain.on(SendEnum.ENGLISH_CHINESE_TRANSLATION, async (event, text) => {
      try {
        const apiKey = currentTranslationModel === GlmModel.GLM_4_FLASH_250414_FREE
          ? dotenv.config().parsed?.GML_FREE_API_KEY
          : currentApiKeys[getModelType(currentTranslationModel)]
        const translateResult = await EnglishChineseTranslation(currentTranslationModel, apiKey as string, text)
        event.reply(SendEnum.ENGLISH_CHINESE_TRANSLATION_SUCCESS, translateResult)
      } catch (error) {
        event.reply(SendEnum.ENGLISH_CHINESE_TRANSLATION_FAIL, getErrorMessage(error))
      }
    })

    /** 设置localForage */
    ipcMain.on(SendEnum.SET_LOCAL_FORAGE, (event, setting) => {
      currentTranslationModel = setting.activeModel
      currentApiKeys = setting.apiKeys
      currentTargetLanguage = setting.targetLanguage
      setAiClient(currentApiKeys)
    })

    /** 初始化localForage */
    ipcMain.on(SendEnum.INIT_LOCAL_FORAGE, (event, setting) => {
      currentTranslationModel = setting.activeModel
      currentApiKeys = setting.apiKeys
      currentTargetLanguage = setting.targetLanguage
      setAiClient(currentApiKeys)
    })

    /** 单独设置开机自启动 */
    ipcMain.on(SendEnum.SET_AUTO_LAUNCH, (event, enabled) => {
      setAutoLaunch(enabled)
    })

    /**
     * 注册快捷键
     */
    let shortcutF2 = globalShortcut.register('F2', () => {
      initiateScreenshotSequence()
    })

    if (!shortcutF2) {
      showNotification('截图快捷键冲突', NoticeType.ERROR)
    }

    /* 注册快捷键ctrl+r */
    let shortcutCtrlR = globalShortcut.register('ctrl+r', () => {
      if (mainWindow) {
        mainWindow.webContents.send(SendEnum.SWAP_CONTENT, null)
      }
    })
    if (!shortcutCtrlR) {
      showNotification('ctrl+r快捷键冲突', NoticeType.ERROR)
    }

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
