import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { SendEnum } from '@src/type/ipc-constants'
import type {
  LocalModelDownloadSourceSetting,
  LocalModelId,
  LocalModelState
} from '@src/type/local-model'
import { LOCAL_MODEL_IDS } from '@src/utils/local-models'

/** 生成初始的本地模型状态映射 */
function createInitialModelStatesMap(): Record<LocalModelId, LocalModelState> {
  return Object.fromEntries(
    LOCAL_MODEL_IDS.map((id) => [
      id,
      {
        id,
        status: 'not-installed',
        sourceKind: null,
        downloadedBytes: 0,
        totalBytes: 0,
        progress: 0
      } satisfies LocalModelState
    ])
  ) as Record<LocalModelId, LocalModelState>
}

/** 清理 Electron IPC 抛错时的冗余前缀 */
function cleanIpcErrorMessage(error: unknown, fallback: string): string {
  const rawMessage = error instanceof Error ? error.message : String(error || '')
  const cleaned = rawMessage
    .replace(/^Error invoking remote method '[^']+': (?:Error: )?/, '')
    .trim()
  return cleaned || fallback
}

/**
 * 订阅并操作主进程托管的按需本地模型状态
 * @returns 模型状态映射与下载/取消/删除操作
 */
export function useLocalModels() {
  const [modelsMap, setModelsMap] = useState<Record<LocalModelId, LocalModelState>>(
    createInitialModelStatesMap
  )
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isCancelled = false

    async function loadStates(): Promise<void> {
      try {
        const list = (await window.electron.ipcRenderer.invoke(
          SendEnum.LOCAL_MODEL_LIST
        )) as LocalModelState[]
        if (isCancelled || !Array.isArray(list)) {
          return
        }
        setModelsMap((previous) => {
          const next = { ...previous }
          for (const item of list) {
            next[item.id] = item
          }
          return next
        })
      } catch {
        // 初始化失败时保持默认未安装状态，由用户触发操作时重试
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    const unsubscribe = window.electron.ipcRenderer.on(
      SendEnum.LOCAL_MODEL_STATE_CHANGED,
      (_event, nextState: LocalModelState) => {
        if (!nextState?.id) {
          return
        }
        setModelsMap((previous) => ({
          ...previous,
          [nextState.id]: nextState
        }))
      }
    )

    void loadStates()

    return () => {
      isCancelled = true
      unsubscribe()
    }
  }, [])

  /** 发起指定模型下载 */
  const downloadModel = useCallback(
    async (
      id: LocalModelId,
      sourceSetting?: Partial<LocalModelDownloadSourceSetting> | null
    ): Promise<void> => {
      try {
        await window.electron.ipcRenderer.invoke(SendEnum.LOCAL_MODEL_DOWNLOAD, {
          id,
          sourceSetting
        })
      } catch (error) {
        toast.error(cleanIpcErrorMessage(error, '模型下载失败，请检查网络或下载源'))
      }
    },
    []
  )

  /** 取消指定模型下载 */
  const cancelDownload = useCallback(async (id: LocalModelId): Promise<void> => {
    try {
      await window.electron.ipcRenderer.invoke(SendEnum.LOCAL_MODEL_CANCEL, id)
    } catch (error) {
      toast.error(cleanIpcErrorMessage(error, '取消下载失败'))
    }
  }, [])

  /** 删除已下载的用户目录模型 */
  const removeModel = useCallback(async (id: LocalModelId): Promise<void> => {
    try {
      await window.electron.ipcRenderer.invoke(SendEnum.LOCAL_MODEL_REMOVE, id)
      toast.success('本地模型已删除')
    } catch (error) {
      toast.error(cleanIpcErrorMessage(error, '删除模型失败'))
    }
  }, [])

  return {
    modelsMap,
    isLoading,
    downloadModel,
    cancelDownload,
    removeModel
  }
}
