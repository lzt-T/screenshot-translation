import { app, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import path from 'path'
import { SendEnum } from '../type/ipc-constants'
import { UpdateProgress } from '../type/update'

let globalProgressInfo: UpdateProgress = {
  percent: 0,
  transferred: 0,
  total: 0,
  delta: 0,
  bytesPerSecond: 0
}

/* 开发环境 */
if (!app.isPackaged) {
  Object.defineProperty(app, 'isPackaged', {
    get: () => true
  })
  autoUpdater.forceDevUpdateConfig = true
  autoUpdater.updateConfigPath = path.join(__dirname, '../../dev-app-update.yml')
}

/* 不允许自动下载更新 */
autoUpdater.autoDownload = false
/* 允许降级更新（应付回滚的情况） */
autoUpdater.allowDowngrade = true

/* 开始检查更新 */
autoUpdater.on('checking-for-update', () => {
  console.log('start checking for update')
})
/* 发现更新 */
autoUpdater.on('update-available', (info) => {
  console.log('find update version', info)
})
/* 没有更新 */
autoUpdater.on('update-not-available', (info) => {
  console.log('no need to update', info.version)
})
/* 更新下载进度 */
autoUpdater.on('download-progress', (progressInfo) => {
  console.log('update progress', progressInfo)
  globalProgressInfo = progressInfo
})
/* 更新下载完成 */
autoUpdater.on('update-downloaded', () => {
  console.log('update downloaded')
  autoUpdater.quitAndInstall()
})
/* 更新失败 */
autoUpdater.on('error', (errorMessage) => {
  console.log('update error', errorMessage)
})


/** 获取应用版本 */
ipcMain.handle(SendEnum.GET_APP_VERSION, (event) => {
  return app.getVersion()
})

/* 检查更新 */
ipcMain.on(SendEnum.CHECK_UPDATE, (event) => {
  autoUpdater.checkForUpdates().then((result) => {
    event.reply(SendEnum.CHECK_UPDATE_RESULT, result)
    event.reply(SendEnum.CHECK_UPDATE_COMPLETE, result)
  })
})

/* 下载更新 */
ipcMain.on(SendEnum.DOWNLOAD_UPDATE, (event) => {
  autoUpdater.downloadUpdate()
})


/** 获取下载进度 */
ipcMain.handle(SendEnum.DOWNLOAD_PROGRESS, (event) => {
  return globalProgressInfo
})
