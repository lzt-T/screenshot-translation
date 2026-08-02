import { ipcMain } from 'electron'
import { SendEnum } from '../../type/ipc-constants'
import { speechService } from '../speech/speech-service'

/**
 * 注册本地语音 IPC 事件
 * @returns {void} 无返回值
 */
export function registerSpeechIpcEvents(): void {
  ipcMain.on(SendEnum.SPEECH_PRELOAD, () => {
    speechService.preload()
  })

  ipcMain.handle(SendEnum.SPEECH_SYNTHESIZE, (_event, text: string) => {
    return speechService.synthesize(text)
  })

  ipcMain.on(SendEnum.SPEECH_CANCEL, () => {
    speechService.cancel()
  })
}
