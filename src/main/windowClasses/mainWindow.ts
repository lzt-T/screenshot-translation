/**
 * @fileoverview 主窗口类
 */

import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { getIconPath } from '../utils/system'

export class MainWindow {
  public window: BrowserWindow | null = null

  constructor() { }

  public createWindow(): void {
    this.window = new BrowserWindow({
      width: 900,
      height: 670,
      show: false,
      autoHideMenuBar: true,
      title: 'Bai_Ze',
      icon: getIconPath(),
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false
      }
    })
    this.window.on('ready-to-show', () => {
      if (this.window) {
        this.window.show()
      }
    })
    this.window.on('closed', () => {
      this.window = null
    })

    // 链接会在外部默认浏览器中打开，而不是在主窗口中打开
    this.window.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })


    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.window.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      this.window.loadFile(join(__dirname, '../renderer/index.html'))
    }
  }
}

const mainWindow = new MainWindow()
export { mainWindow }
