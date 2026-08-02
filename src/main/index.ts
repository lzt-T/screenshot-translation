import { app, BrowserWindow, ipcMain } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { registerAutoUpdate } from './utils/update'
import { mainWindow } from './windowClasses/mainWindow'
import { init } from './utils/init'
import { terminateOcrWorker } from './utils/imageOCR'
import { speechService } from './speech/speech-service'
import { recognitionService } from './speech/recognition-service'
import { learningRepository } from './learning/learning-repository'

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
      if (mainWindow.window?.isMinimized()) {
        mainWindow.window?.restore()
      }
      mainWindow.window?.show()
      mainWindow.window?.focus()
    }
  })
}

/**
 * 创建主窗口
 */
function createWindow(): void {
  mainWindow.createWindow()
  registerAutoUpdate()
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron.app')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  try {
    learningRepository.initialize()
  } catch (error) {
    console.error('学习收藏数据库初始化失败：', error)
  }

  createWindow()
  init()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  // 退出前关闭学习收藏数据库
  learningRepository.close()
  // 退出前释放 OCR Worker
  void terminateOcrWorker()
  // 退出前释放语音 Worker
  void speechService.dispose()
  // 退出前释放实时识别 Worker
  void recognitionService.dispose()
})
