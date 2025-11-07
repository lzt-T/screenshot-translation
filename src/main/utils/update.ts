/**
 * @fileoverview 注册自动更新
 */
import { app, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import path from 'path'
import { SendEnum } from '../../type/ipc-constants'
import { showNotification } from './notification'
import { NoticeType } from '../../type/notice'
import { mainWindow } from '../windowClasses/mainWindow'

/**
 * @description 注册自动更新
 */
export const registerAutoUpdate = () => {
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
    autoUpdater.downloadUpdate()
  })
  /* 没有更新 */
  autoUpdater.on('update-not-available', (info) => {
    console.log('no need to update', info.version)
  })
  /* 更新下载进度 */
  autoUpdater.on('download-progress', (progressInfo) => {
    console.log('update progress', progressInfo)
    mainWindow.window?.webContents.send(SendEnum.DOWNLOAD_PROGRESS, progressInfo)
  })
  /* 更新下载完成 */
  autoUpdater.on('update-downloaded', () => {
    console.log('update downloaded')
    mainWindow.window?.webContents.send(SendEnum.UPDATE_DOWNLOAD_COMPLETE)
  })
  /* 更新失败 */
  autoUpdater.on('error', (errorMessage) => {
    console.log('update error', errorMessage.message)
    showNotification(errorMessage.message, NoticeType.ERROR)
    mainWindow.window?.webContents.send(SendEnum.DOWNLOAD_FAIL)
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

  /* 重启更新 */
  ipcMain.on(SendEnum.RESTART_UPDATE_AND_INSTALL, (event) => {
    autoUpdater.quitAndInstall()
  })
}
