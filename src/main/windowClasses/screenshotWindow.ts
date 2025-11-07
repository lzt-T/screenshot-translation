/**
 * @fileoverview 截图窗口类
 */
import { BrowserWindow } from 'electron'
import { is } from '@electron-toolkit/utils'
import { join } from 'path'
import { screen, Display } from 'electron'
import { getConfig } from '../../utils/config'

const { SCREENSHOT_WINDOW_LISTEN_MOUSE_POSITION_INTERVAL } = getConfig()

export class ScreenshotWindow {
  public window: BrowserWindow | null = null
  /** 是否正在截图 */
  public isScreenshotting: boolean = false
  /** 当前显示器 */
  public currentDisplay: Display | null = null
  /** 截图区域 */
  public lastBounds: { x: number, y: number, width: number, height: number } | null = null
  /* 监听鼠标位置变化的定时器 */
  private mousePositionInterval: NodeJS.Timeout | null = null

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
    this.listenMousePositionChange()
    this.window.on('ready-to-show', () => {
      if (this.window) {
        this.window.show()
      }
    })
    this.window.on('closed', () => {
      this.window = null
      this.stopListenMousePositionChange()
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/windows/screenshotSelector`)
    } else {
      this.window.loadFile(
        join(__dirname, '../renderer/src/windows/screenshotSelector/index.html')
      )
    }
  }

  /* 监听鼠标位置变化 */
  public listenMousePositionChange(): void {
    this.mousePositionInterval = setInterval(() => {
      const cursorPoint = screen.getCursorScreenPoint();
      // 获取当前鼠标所在的显示器
      const display = screen.getDisplayNearestPoint(cursorPoint);
      this.setCurrentDisplay(display)

      this.window?.setBounds({
        x: display.bounds.x,
        y: display.bounds.y,
        width: display.bounds.width,
        height: display.bounds.height
      })
    }, SCREENSHOT_WINDOW_LISTEN_MOUSE_POSITION_INTERVAL)
  }

  /* 停止监听鼠标位置变化 */
  public stopListenMousePositionChange(): void {
    if (this.mousePositionInterval) {
      clearInterval(this.mousePositionInterval)
      this.mousePositionInterval = null
    }
  }

  /**
   * @description 设置当前显示器
   * @param {Display} display 显示器
   */
  public setCurrentDisplay(display: Display): void {
    this.currentDisplay = display
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
