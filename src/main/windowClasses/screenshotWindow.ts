/**
 * @fileoverview 截图窗口类
 */

import { BrowserWindow } from 'electron'
import { is } from '@electron-toolkit/utils'
import { join } from 'path'


export class ScreenshotWindow {
  public window: BrowserWindow | null = null
  /** 是否正在截图 */
  public isScreenshotting: boolean = false
  /** 截图区域 */
  public lastBounds: { x: number, y: number, width: number, height: number } | null = null

  constructor() { }

  public createWindow(): void {

    if (this.window && !this.window.isDestroyed()) {
      this.window.focus()
      return
    }

    this.window = new BrowserWindow({
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
    this.window.on('ready-to-show', () => {
      if (this.window) {
        this.window.show()
      }
    })
    this.window.on('closed', () => {
      this.window = null
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/windows/screenshotSelector`)
    } else {
      this.window.loadFile(
        join(__dirname, '../renderer/src/windows/screenshotSelector/index.html')
      )
    }
  }

  /**
   * @description 改变截图窗口状态
   * @param {boolean} state 截图窗口状态
   */
  public changeScreenshottingState(state: boolean): void {
    this.isScreenshotting = state
  }

  /**
   * @description 关闭截图窗口
   */
  public closeWindow(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.close()
    }
  }

  /**
   * @description 设置截图区域
   * @param {Object | null} bounds { x: number, y: number, width: number, height: number } 截图区域
   */
  public setBounds(bounds: { x: number, y: number, width: number, height: number } | null): void {
    this.lastBounds = bounds
  }

}

const screenshotWindow = new ScreenshotWindow()
export { screenshotWindow }
