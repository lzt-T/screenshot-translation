/**
 * @fileoverview 主窗口类
 */

import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { getIconPath } from '../utils/system'

/** 主窗口不同主题的标题栏覆盖配置 */
const TITLE_BAR_OVERLAY_THEME_MAP: Record<
  'light' | 'dark',
  { color: string; symbolColor: string; height: number }
> = {
  light: { color: '#f1f0eb', symbolColor: '#181c24', height: 48 },
  dark: { color: '#14171f', symbolColor: '#e8edf5', height: 48 }
}

export class MainWindow {
  public window: BrowserWindow | null = null

  constructor() { }

  /**
   * 同步主窗口原生标题栏覆盖按钮的主题配色
   * @param resolvedTheme 当前解析后的明暗主题
   * @returns {void} 无返回值
   */
  public syncTitleBarTheme(resolvedTheme: 'light' | 'dark'): void {
    if (!this.window || this.window.isDestroyed()) {
      return
    }
    if (typeof this.window.setTitleBarOverlay === 'function') {
      this.window.setTitleBarOverlay(TITLE_BAR_OVERLAY_THEME_MAP[resolvedTheme])
    }
  }

  public createWindow(): void {
    this.window = new BrowserWindow({
      width: 1080,
      height: 740,
      minWidth: 840,
      minHeight: 600,
      show: false,
      autoHideMenuBar: true,
      titleBarStyle: 'hidden',
      titleBarOverlay: TITLE_BAR_OVERLAY_THEME_MAP.light,
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
