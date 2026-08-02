import { ipcMain } from 'electron'
import { SendEnum } from '../../type/ipc-constants'
import { recognitionService } from '../speech/recognition-service'

/** 注册实时英文识别 IPC 事件 */
export function registerRecognitionIpcEvents(): void {
  ipcMain.on(SendEnum.RECOGNITION_START, (event) => {
    recognitionService.start(event.sender)
  })

  ipcMain.on(SendEnum.RECOGNITION_AUDIO, (_event, samples: Float32Array, sampleRate: number) => {
    recognitionService.acceptAudio(samples, sampleRate)
  })

  ipcMain.on(SendEnum.RECOGNITION_STOP, () => {
    recognitionService.stop()
  })
}
