import { app, shell, BrowserWindow, ipcMain, globalShortcut, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { SendEnum } from '../type/ipc-constants'
import { captureArea } from './utils/captureArea'
import { analyzeScreenshot, TranslateTextBlock } from './utils/imageAnalyzer'
import { Model, GeminiModel, TargetLanguage } from '../type/model'
import { NoticeType } from '../type/notice'
import { getErrorMessage } from './utils/error'
import { getModelType } from '../utils/ai'
import { getConfig } from '../utils/config'
import { setAiClient } from './utils/ai'
import { EnglishChineseTranslation } from './utils/EnglishChineseTranslation'

const { MIN_RESULT_WINDOW_WIDTH, MIN_RESULT_WINDOW_HEIGHT,
  RESULT_WINDOW_BAR_HEIGHT,
  NOTIFICATION_BAR_HEIGHT,
  NOTIFICATION_BAR_WIDTH,
  NOTIFICATION_BAR_MARGIN
} = getConfig()



let mainWindow: BrowserWindow | null = null
let screenshotWindow: BrowserWindow | null = null
let resultWindow: BrowserWindow | null = null
/** 通知窗口 */
let notificationWindow: BrowserWindow | null = null
let isScreenshotting = false
let lastBounds = null
/** 当前目标语言 */
let currentTargetLanguage = TargetLanguage.ZH_CN
/** 当前翻译模型 */
let currentTranslationModel = GeminiModel.GEMINI_2_0_FLASH
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
    }
    screenshotWindow = null
  })
}

// 截图启动逻辑
function initiateScreenshotSequence() {
  const apiKey = currentApiKeys[getModelType(currentTranslationModel)]

  if (!apiKey) {
    createNotificationWindow(
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

    if (notificationWindow && !notificationWindow.isDestroyed()) {
      try {
        notificationWindow.close()
      } catch (e) {
        console.warn('Error closing notification window during result window load:', e);
      }
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
}

/**
 * 创建通知窗口
 */
async function createNotificationWindow(message, type: NoticeType = NoticeType.INFO) {
  if (notificationWindow && !notificationWindow.isDestroyed()) {
    try {
      notificationWindow.close()
    } catch (e) { }
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize
  const width = NOTIFICATION_BAR_WIDTH

  /** 计算初始高度 */
  const height = NOTIFICATION_BAR_HEIGHT
  const margin = NOTIFICATION_BAR_MARGIN
  const newX = Math.round(screenWidth - width - margin)
  const newY = Math.round(screenHeight - height - margin)

  notificationWindow = new BrowserWindow({
    width,
    height,
    x: newX,
    y: newY,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    show: false, // 初始隐藏
    webPreferences: {
      contextIsolation: true,
      preload: join(__dirname, '../preload/index.js')
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    notificationWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/windows/notification`)
  } else {
    notificationWindow.loadFile(join(__dirname, '../renderer/src/windows/notification/index.html'))
  }

  notificationWindow.on('ready-to-show', () => {
    if (notificationWindow && !notificationWindow.isDestroyed()) {
      notificationWindow.show()
      notificationWindow.webContents.send(SendEnum.DISPLAY_NOTIFICATION, {
        message: message,
        type: type
      })
    }
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
    ...(process.platform === 'linux' ? { icon } : {}),
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

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  ipcMain.on(SendEnum.SCREENSHOT_START, () => {
    initiateScreenshotSequence()
  })

  // 截图区域选择完成监听器
  ipcMain.on(SendEnum.SCREENSHOT_SELECTED, async (event, bounds) => {
    console.log('SCREENSHOT_SELECTED: received bounds', bounds)
    if (!isScreenshotting) {
      return
    }

    lastBounds = bounds // 存储边界用于分析

    // 立即关闭选择窗口
    if (screenshotWindow && !screenshotWindow.isDestroyed()) {
      console.log('SCREENSHOT_SELECTED: close the selection window.')
      try {
        screenshotWindow.close()
      } catch (e) { }
    }

    // 显示加载窗口
    createNotificationWindow('翻译中...')

    // 开始后台处理
    let analysisResult: {
      success: boolean
      msg?: string
      textBlocks: TranslateTextBlock[]
    } = {
      success: false,
      textBlocks: [],
      msg: ''
    }
    try {
      const imageData = await captureArea(lastBounds)

      const apiKey = currentApiKeys[getModelType(currentTranslationModel)]

      analysisResult = await analyzeScreenshot(imageData, currentTranslationModel, apiKey as string, currentTargetLanguage)

      // 检查分析结果是否成功
      if (analysisResult && analysisResult.success) {
        // 仅在成功时创建和显示结果窗口
        await createResultWindow(analysisResult, lastBounds)
      }
    } catch (error) {
      if (notificationWindow && !notificationWindow.isDestroyed()) {
        notificationWindow.close()
      }
      const errorMessage = getErrorMessage(error)
      setTimeout(() => {
        console.log(errorMessage, '[Error Log]')
        createNotificationWindow(`分析失败: ${errorMessage}`, NoticeType.ERROR)
      }, 500)
    } finally {
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
    if (notificationWindow) {
      notificationWindow.close()
    }
  })

  /** 复制文本成功 */
  ipcMain.on(SendEnum.COPY_TEXT_SUCCESS, () => {
    if (notificationWindow && !notificationWindow.isDestroyed()) {
      notificationWindow.close()
    }
    createNotificationWindow('复制成功', NoticeType.SUCCESS)
  })

  /** 英汉互译 */
  ipcMain.on(SendEnum.ENGLISH_CHINESE_TRANSLATION, async (event, text) => {
    try {
      const apiKey = currentApiKeys[getModelType(currentTranslationModel)]
      const translateResult = await EnglishChineseTranslation(currentTranslationModel, apiKey, text)
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
    createNotificationWindow('设置已保存', NoticeType.SUCCESS)
  })

  /** 初始化localForage */
  ipcMain.on(SendEnum.INIT_LOCAL_FORAGE, (event, setting) => {
    currentTranslationModel = setting.activeModel
    currentApiKeys = setting.apiKeys
    currentTargetLanguage = setting.targetLanguage
    setAiClient(currentApiKeys)
  })

  /**
   * 注册快捷键
   */
  let shortcut = globalShortcut.register('F2', () => {
    initiateScreenshotSequence()
  })

  if (!shortcut) {
    createNotificationWindow('截图快捷键冲突', NoticeType.ERROR)
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
