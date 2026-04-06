import { app, BrowserWindow, ipcMain } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { registerAutoUpdate } from './utils/update'
import { mainWindow } from './windowClasses/mainWindow'
import { init } from './utils/init'
import { terminateOcrWorker } from './utils/imageOCR'

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
  // 退出前释放 OCR Worker
  void terminateOcrWorker()
})
