/**
 * @fileoverview 截图窗口类
 */
import { BrowserWindow, screen, type Display } from 'electron'
import { is } from '@electron-toolkit/utils'
import { join } from 'path'
import { getConfig } from '../../utils/config'

// 截图窗口检查光标显示器的间隔时间
const { SCREENSHOT_WINDOW_DISPLAY_CHECK_INTERVAL } = getConfig()

export class ScreenshotWindow {
  /** 截图选择窗口 */
  public window: BrowserWindow | null = null
  /** 是否正在截图 */
  public isScreenshotting: boolean = false
  /** 当前显示器 */
  public currentDisplay: Display | null = null
  /** 截图区域 */
  public lastBounds: { x: number, y: number, width: number, height: number } | null = null
  /** 等待选择时的显示器检查定时器 */
  private displayCheckInterval: NodeJS.Timeout | null = null

  /** 创建截图窗口管理器 */
  constructor() { }

  /** 创建并加载保持隐藏的截图窗口 */
  public async createWindow(): Promise<void> {
    if (this.window && !this.window.isDestroyed()) {
      return
    }

    // 截图启动时鼠标所在的位置
    const cursorPoint = screen.getCursorScreenPoint()
    // 截图启动时鼠标所在的显示器
    const display = screen.getDisplayNearestPoint(cursorPoint)
    this.setCurrentDisplay(display)

    // 本次创建的截图窗口
    const screenshotBrowserWindow = new BrowserWindow({
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      frame: false,
      transparent: true,
      show: false,
      focusable: true,
      resizable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      webPreferences: {
        contextIsolation: true,
        sandbox: false,
        preload: join(__dirname, '../preload/index.js')
      }
    })
    this.window = screenshotBrowserWindow

    screenshotBrowserWindow.on('closed', () => {
      if (this.window === screenshotBrowserWindow) {
        this.window = null
      }
      this.stopDisplayTracking()
    })

    // 当前窗口是否已经记录过原生鼠标按下事件
    let hasLoggedNativeMouseDown = false
    screenshotBrowserWindow.webContents.on('before-mouse-event', (_event, mouseInput) => {
      if (mouseInput.type !== 'mouseDown') {
        return
      }
      if (is.dev && !hasLoggedNativeMouseDown) {
        console.info('[ScreenshotWindow] Native mouseDown received', {
          displayId: this.currentDisplay?.id,
          x: mouseInput.x,
          y: mouseInput.y
        })
        hasLoggedNativeMouseDown = true
      }
      this.stopDisplayTracking()
    })

    screenshotBrowserWindow.webContents.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown' && input.key === 'Escape') {
        event.preventDefault()
        this.cancelScreenshot()
      }
    })

    try {
      if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        // 开发环境专用截图页面地址
        const screenshotRendererUrl = new URL(
          '/src/windows/screenshotSelector/index.html',
          process.env['ELECTRON_RENDERER_URL']
        ).toString()
        await screenshotBrowserWindow.loadURL(screenshotRendererUrl)
      } else {
        await screenshotBrowserWindow.loadFile(
          join(__dirname, '../renderer/src/windows/screenshotSelector/index.html')
        )
      }

      if (screenshotBrowserWindow.isDestroyed()) {
        throw new Error('截图窗口在页面加载完成前已关闭')
      }
    } catch (error) {
      this.stopDisplayTracking()
      if (!screenshotBrowserWindow.isDestroyed()) {
        screenshotBrowserWindow.destroy()
      }
      if (this.window === screenshotBrowserWindow) {
        this.window = null
      }
      throw error
    }
  }

  /** 显示截图窗口并取得原生输入焦点 */
  public activateWindow(): void {
    // 当前待激活的截图窗口
    const activeWindow = this.window
    if (!activeWindow || activeWindow.isDestroyed()) {
      throw new Error('截图窗口不可用')
    }

    activeWindow.setIgnoreMouseEvents(false)
    activeWindow.setFocusable(true)
    activeWindow.show()
    activeWindow.focus()

    if (!activeWindow.isVisible() || !activeWindow.isFocusable() || !activeWindow.isFocused()) {
      throw new Error('截图窗口未取得输入焦点')
    }
    this.startDisplayTracking()
  }

  /** 等待选择时跟随光标所在显示器 */
  public startDisplayTracking(): void {
    this.stopDisplayTracking()
    this.displayCheckInterval = setInterval(() => {
      // 当前可用的截图窗口
      const activeWindow = this.window
      if (!activeWindow || activeWindow.isDestroyed()) {
        this.stopDisplayTracking()
        return
      }

      // 当前光标所在的显示器
      const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
      if (display.id === this.currentDisplay?.id) {
        return
      }

      this.setCurrentDisplay(display)
      activeWindow.setBounds(display.bounds)
      activeWindow.moveTop()
      activeWindow.focus()
    }, SCREENSHOT_WINDOW_DISPLAY_CHECK_INTERVAL)
  }

  /** 停止跟随光标所在显示器 */
  public stopDisplayTracking(): void {
    if (this.displayCheckInterval) {
      clearInterval(this.displayCheckInterval)
      this.displayCheckInterval = null
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
    this.stopDisplayTracking()
    if (this.window && !this.window.isDestroyed()) {
      this.window.close()
    }
  }

  /** 取消截图并重置截图会话 */
  public cancelScreenshot(): void {
    this.stopDisplayTracking()
    this.setBounds(null)
    this.changeScreenshottingState(false)
    this.closeWindow()
  }

  /**
   * @description 设置截图区域
   * @param {Object | null} bounds { x: number, y: number, width: number, height: number } 截图区域
   */
  public setBounds(bounds: { x: number, y: number, width: number, height: number } | null): void {
    this.lastBounds = bounds
  }

}

// 全局截图窗口管理器
const screenshotWindow = new ScreenshotWindow()
export { screenshotWindow }
