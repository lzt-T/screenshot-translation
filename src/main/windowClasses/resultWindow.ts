
import { BrowserWindow } from 'electron'
import { is } from '@electron-toolkit/utils'
import { join } from 'path'
import { screenshotWindow } from './screenshotWindow'
import { getConfig } from '../../utils/config'
import { SendEnum } from '../../type/ipc-constants'

const { MIN_RESULT_WINDOW_WIDTH, MIN_RESULT_WINDOW_HEIGHT,
  RESULT_WINDOW_BAR_HEIGHT,
} = getConfig()

export class ResultWindow {
  public window: BrowserWindow | null = null
  public resultData: any = null

  constructor() { }

  public createWindow(): void {
    this.window = new BrowserWindow({
      x: Math.round(screenshotWindow.lastBounds?.x || 0),
      y: Math.round(screenshotWindow.lastBounds?.y || 0),
      width: Math.max(Math.round(screenshotWindow.lastBounds?.width || 0), MIN_RESULT_WINDOW_WIDTH),
      height: Math.max(Math.round(screenshotWindow.lastBounds?.height || 0 + RESULT_WINDOW_BAR_HEIGHT), MIN_RESULT_WINDOW_HEIGHT),
      frame: false,
      transparent: true,
      // alwaysOnTop: true,
      resizable: false,
      movable: true,
      webPreferences: {
        contextIsolation: true,
        preload: join(__dirname, '../preload/index.js')
      }
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/windows/resultOverlay`)
    } else {
      this.window.loadFile(join(__dirname, '../renderer/src/windows/resultOverlay/index.html'))
    }

    this.window.webContents.on('did-finish-load', () => {
      if (this.window && !this.window.isDestroyed()) {
        this.window.show()
      }
    })

    this.window?.webContents.once('dom-ready', () => {
      if (this.window && !this.window.isDestroyed()) {
        this.window.webContents.send(SendEnum.DISPLAY_TRANSLATION_RESULT, {
          result: this.resultData,
          bounds: screenshotWindow.lastBounds
        })
      }
    })

    this.window.on('closed', () => {
      this.window = null
    })
  }


  /**
   * @description 关闭结果窗口
   */
  public closeWindow(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.close()
    }
  }

  /**
   * @description 设置结果数据
   * @param {any} resultData 结果数据
   */
  public setResultData(resultData: any): void {
    this.resultData = resultData
  }

}

const resultWindow = new ResultWindow()
export { resultWindow }
