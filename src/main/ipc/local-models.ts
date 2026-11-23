import { ipcMain } from 'electron'
import { SendEnum } from '../../type/ipc-constants'
import type { LocalModelDownloadSourceSetting, LocalModelId } from '../../type/local-model'
import { localModelManager } from '../speech/local-model-manager'
import { recognitionService } from '../speech/recognition-service'
import { speechService } from '../speech/speech-service'

/** 替换或删除模型前需要释放的对应运行服务映射 */
const MODEL_DISPOSE_HANDLER_MAP: Readonly<Record<LocalModelId, () => Promise<void>>> = {
  'kokoro-tts': () => speechService.dispose(),
  'whisper-asr': () => recognitionService.dispose()
}

/** 下载本地模型 IPC 请求载荷 */
interface DownloadLocalModelPayload {
  /** 模型标识 */
  id: LocalModelId
  /** 下载源配置 */
  sourceSetting?: Partial<LocalModelDownloadSourceSetting> | null
}

/** 注册本地按需模型管理 IPC 事件 */
export function registerLocalModelIpcEvents(): void {
  ipcMain.handle(SendEnum.LOCAL_MODEL_LIST, () => {
    return localModelManager.getAllStates()
  })

  ipcMain.handle(SendEnum.LOCAL_MODEL_DOWNLOAD, (_event, payload: DownloadLocalModelPayload) => {
    return localModelManager.downloadModel(
      payload.id,
      payload.sourceSetting,
      MODEL_DISPOSE_HANDLER_MAP[payload.id]
    )
  })

  ipcMain.handle(SendEnum.LOCAL_MODEL_CANCEL, (_event, id: LocalModelId) => {
    return localModelManager.cancelDownload(id)
  })

  ipcMain.handle(SendEnum.LOCAL_MODEL_REMOVE, (_event, id: LocalModelId) => {
    return localModelManager.removeModel(id, MODEL_DISPOSE_HANDLER_MAP[id])
  })
}
