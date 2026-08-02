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
import type { UpdateCheckCompleteResult, UpdateAvailableInfo } from '../../type/update'

// 差分更新偶发断连时 Electron 抛出的网络错误标识
const UPDATE_CONNECTION_CLOSED_ERROR = 'net::ERR_CONNECTION_CLOSED'

/**
 * 处理更新下载期间未捕获的主进程异常
 * @param error 主进程捕获的异常
 */
function handleUpdateDownloadException(error: Error): void {
  if (!error.message.includes(UPDATE_CONNECTION_CLOSED_ERROR)) {
    process.off('uncaughtException', handleUpdateDownloadException)
    throw error
  }

  console.warn('update differential download connection closed, fallback continues', error.message)
}

/** 移除更新下载期间的网络异常边界 */
function removeUpdateDownloadErrorBoundary(): void {
  process.off('uncaughtException', handleUpdateDownloadException)
}

/**
 * @description 注册自动更新
 */
export const registerAutoUpdate = (): void => {
  // 当前应用生命周期内是否已有更新正在下载或等待安装
  let hasActiveUpdate = false

  /* 开发环境 */
  if (!app.isPackaged) {
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
    if (hasActiveUpdate) {
      return
    }

    hasActiveUpdate = true
    // 提供给渲染层的可用更新信息
    const updateInfo: UpdateAvailableInfo = { version: info.version }
    mainWindow.window?.webContents.send(SendEnum.UPDATE_AVAILABLE, updateInfo)
    removeUpdateDownloadErrorBoundary()
    process.on('uncaughtException', handleUpdateDownloadException)
    /* 下载错误由 autoUpdater 的 error 事件统一处理 */
    void autoUpdater
      .downloadUpdate()
      .catch(removeUpdateDownloadErrorBoundary)
      .finally(removeUpdateDownloadErrorBoundary)
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
    hasActiveUpdate = false
    showNotification(errorMessage.message, NoticeType.ERROR)
    mainWindow.window?.webContents.send(SendEnum.DOWNLOAD_FAIL, errorMessage.message)
  })


  /** 获取应用版本 */
  ipcMain.handle(SendEnum.GET_APP_VERSION, (event) => {
    return app.getVersion()
  })

  /* 检查更新 */
  ipcMain.on(SendEnum.CHECK_UPDATE, async (event) => {
    if (hasActiveUpdate) {
      // 已在下载或等待安装时直接复用当前更新状态
      const checkResult: UpdateCheckCompleteResult = { isUpdateAvailable: true }
      event.reply(SendEnum.CHECK_UPDATE_COMPLETE, checkResult)
      return
    }

    try {
      // 自动更新检查结果
      const result = await autoUpdater.checkForUpdates()
      // 提供给关于页的规范化检查结果
      const checkResult: UpdateCheckCompleteResult = {
        isUpdateAvailable: result?.isUpdateAvailable ?? false
      }
      event.reply(SendEnum.CHECK_UPDATE_RESULT, result)
      event.reply(SendEnum.CHECK_UPDATE_COMPLETE, checkResult)
    } catch (error) {
      // 检查失败时用于恢复按钮状态的错误信息
      const errorMessage = error instanceof Error ? error.message : String(error)
      // 提供给关于页的失败检查结果
      const checkResult: UpdateCheckCompleteResult = {
        isUpdateAvailable: false,
        errorMessage
      }
      event.reply(SendEnum.CHECK_UPDATE_COMPLETE, checkResult)
    }
  })

  /* 重启更新 */
  ipcMain.on(SendEnum.RESTART_UPDATE_AND_INSTALL, (event) => {
    autoUpdater.quitAndInstall()
  })
}
