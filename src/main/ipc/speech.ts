import { ipcMain } from 'electron'
import { SendEnum } from '../../type/ipc-constants'
import { speechService } from '../speech/speech-service'
import type { SpeechSynthesisRequest } from '../../type/speech-settings'
import { cancelRemoteSpeech, synthesizeRemoteSpeech } from '../speech/remote-speech'
import { KOKORO_VOICES } from '../../utils/kokoro-voices'

/**
 * 注册本地语音 IPC 事件
 * @returns {void} 无返回值
 */
export function registerSpeechIpcEvents(): void {
  ipcMain.on(SendEnum.SPEECH_PRELOAD, () => {
    speechService.preload()
  })

  ipcMain.handle(SendEnum.SPEECH_SYNTHESIZE, (event, request: SpeechSynthesisRequest | string) => {
    if (typeof request === 'string') return speechService.synthesize(request)
    if (request.settings.source === 'third-party') return synthesizeRemoteSpeech(event.sender.id, request)
    // 模型可用音色编号
    const voice = KOKORO_VOICES.find((item) => item.id === request.settings.kokoroVoice)
    if (request.settings.kokoroVoice !== 'auto' && !voice) throw new Error('Kokoro 音色不可用，请重新选择')
    return speechService.synthesize(request.text, voice ? Number(voice.id) : undefined)
  })

  ipcMain.handle(SendEnum.SPEECH_CANCEL, (event) => {
    cancelRemoteSpeech(event.sender.id)
    speechService.cancel()
  })
}
