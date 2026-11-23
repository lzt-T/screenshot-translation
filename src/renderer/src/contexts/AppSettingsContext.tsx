import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import localForage from 'localforage'
import { v4 as uuidV4 } from 'uuid'
import { toast } from 'sonner'
import { Language } from '@src/type/base'
import { SendEnum } from '@src/type/ipc-constants'
import { AutoLaunchSetting, ModelFieldKey, TranslationModelProfile } from '@src/type/model'
import type { ProxySetting } from '@src/type/proxy'
import type { SpeechSettings } from '@src/type/speech-settings'
import type { LocalModelDownloadSourceSetting } from '@src/type/local-model'
import { createDefaultModelProfiles, DEFAULT_ACTIVE_MODEL_ID } from '@src/utils/modelProfiles'
import { DEFAULT_PROXY_SETTING } from '@src/utils/proxy'
import { createDefaultSpeechSettings, normalizeSpeechSettings } from '@src/utils/speech-settings'
import {
  createDefaultLocalModelSourceSetting,
  normalizeLocalModelSourceSetting
} from '@src/utils/local-models'

/** 本地存储的应用配置 */
export interface StoreSetting {
  targetLanguage: Language
  activeModelId: string
  models: TranslationModelProfile[]
  autoLaunch: AutoLaunchSetting
  proxy: ProxySetting
  speech: SpeechSettings
  localModelSource: LocalModelDownloadSourceSetting
}

/** 设置保存作用域 */
export type SettingSaveScope = 'general' | 'model' | 'speech' | 'network'

/** 自动保存状态 */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

/** 按区块隔离的保存状态映射 */
export type SaveStatusByScope = Record<SettingSaveScope, SaveStatus>

/** 共享设置上下文契约 */
interface AppSettingsContextValue {
  settings: StoreSetting
  isReady: boolean
  activeModel: TranslationModelProfile | null
  saveStatusByScope: SaveStatusByScope
  updateSetting: <TKey extends keyof StoreSetting>(
    key: TKey,
    value: StoreSetting[TKey],
    scope: SettingSaveScope
  ) => Promise<boolean>
  setActiveModel: (modelId: string) => Promise<boolean>
  updateModelField: (modelId: string, key: ModelFieldKey, value: string) => void
  addCustomModel: () => TranslationModelProfile
  removeCustomModel: (modelId: string) => Promise<boolean>
  resetModelSettings: () => Promise<boolean>
}

/** 创建默认应用设置快照 */
function createDefaultSettings(): StoreSetting {
  return {
    targetLanguage: Language.ZH,
    activeModelId: DEFAULT_ACTIVE_MODEL_ID,
    models: createDefaultModelProfiles(),
    autoLaunch: { enabled: false },
    proxy: DEFAULT_PROXY_SETTING,
    speech: createDefaultSpeechSettings(),
    localModelSource: createDefaultLocalModelSourceSetting()
  }
}

/**
 * 获取下一个自定义模型序号
 * @param models 当前模型列表
 * @returns 不重复的模型序号
 */
function getNextCustomModelSerial(models: TranslationModelProfile[]): number {
  // 已使用的自定义模型序号
  const usedSerials = models
    .filter((model) => !model.isBuiltInFree)
    .map((model) => model.displayName?.match(/^自定义模型 (\d+)$/)?.[1])
    .filter((serial): serial is string => Boolean(serial))
    .map(Number)
  return Math.max(0, ...usedSerials) + 1
}

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null)

/**
 * 提供全局同步的应用配置状态与持久化操作
 * @param props 包含子节点
 * @returns 共享设置提供器
 */
export function AppSettingsProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  // 当前生效配置
  const [settings, setSettings] = useState<StoreSetting>(createDefaultSettings)
  // 本地设置是否已读取完毕
  const [isReady, setIsReady] = useState(false)
  // 各区块独立的保存状态
  const [saveStatusByScope, setSaveStatusByScope] = useState<SaveStatusByScope>({
    general: 'idle',
    model: 'idle',
    speech: 'idle',
    network: 'idle'
  })
  // 最新配置引用，避免闭包读取旧值
  const settingsRef = useRef(settings)
  // 串行持久化队列
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())
  // 各区块当前并发保存计数
  const pendingCountRef = useRef<Record<SettingSaveScope, number>>({
    general: 0,
    model: 0,
    speech: 0,
    network: 0
  })
  // 各区块当前批次失败标记
  const scopeErrorRef = useRef<Record<SettingSaveScope, boolean>>({
    general: false,
    model: false,
    speech: false,
    network: false
  })
  // 是否已完成向主进程的首次同步
  const hasSyncedInitialRef = useRef(false)

  settingsRef.current = settings

  /** 首次从 localForage 加载配置并同步主进程 */
  useEffect(() => {
    let isCancelled = false

    async function loadSettings(): Promise<void> {
      const defaults = createDefaultSettings()
      const [models, activeModelId, targetLanguage, autoLaunch, proxy, speech, localModelSource] =
        await Promise.all([
          localForage.getItem<TranslationModelProfile[]>('models'),
          localForage.getItem<string>('activeModelId'),
          localForage.getItem<Language>('targetLanguage'),
          localForage.getItem<AutoLaunchSetting>('autoLaunch'),
          localForage.getItem<ProxySetting>('proxy'),
          localForage.getItem<SpeechSettings>('speech'),
          localForage.getItem<LocalModelDownloadSourceSetting>('localModelSource')
        ])

      if (isCancelled) {
        return
      }

      const loaded: StoreSetting = {
        targetLanguage: targetLanguage || defaults.targetLanguage,
        activeModelId: activeModelId || defaults.activeModelId,
        models: models && models.length > 0 ? models : defaults.models,
        autoLaunch: autoLaunch || defaults.autoLaunch,
        proxy: proxy || defaults.proxy,
        speech: normalizeSpeechSettings(speech),
        localModelSource: normalizeLocalModelSourceSetting(localModelSource)
      }

      settingsRef.current = loaded
      setSettings(loaded)
      setIsReady(true)

      if (!hasSyncedInitialRef.current) {
        hasSyncedInitialRef.current = true
        window.electron.ipcRenderer.send(SendEnum.INIT_LOCAL_FORAGE, loaded)
      }
    }

    void loadSettings()
    return () => {
      isCancelled = true
    }
  }, [])

  /** 按区块串行写入单项设置并反馈独立状态 */
  const persistSetting = useCallback(
    async <TKey extends keyof StoreSetting>(
      key: TKey,
      value: StoreSetting[TKey],
      scope: SettingSaveScope
    ): Promise<boolean> => {
      if (pendingCountRef.current[scope] === 0) {
        scopeErrorRef.current[scope] = false
      }
      pendingCountRef.current[scope] += 1
      setSaveStatusByScope((prev) => ({ ...prev, [scope]: 'saving' }))

      const saveTask = saveQueueRef.current.then(async (): Promise<boolean> => {
        try {
          await localForage.setItem(key, value)
          return true
        } catch {
          scopeErrorRef.current[scope] = true
          return false
        } finally {
          pendingCountRef.current[scope] -= 1
          if (pendingCountRef.current[scope] === 0) {
            const nextStatus: SaveStatus = scopeErrorRef.current[scope] ? 'error' : 'saved'
            setSaveStatusByScope((prev) => ({ ...prev, [scope]: nextStatus }))
          }
        }
      })

      saveQueueRef.current = saveTask.then(() => undefined)
      return saveTask
    },
    []
  )

  /** 更新设置、同步主进程并持久化 */
  const updateSetting = useCallback(
    <TKey extends keyof StoreSetting>(
      key: TKey,
      value: StoreSetting[TKey],
      scope: SettingSaveScope
    ): Promise<boolean> => {
      const nextSettings: StoreSetting = {
        ...settingsRef.current,
        [key]: value
      }
      settingsRef.current = nextSettings
      setSettings(nextSettings)

      if (key === 'autoLaunch') {
        const autoLaunchSetting = value as AutoLaunchSetting
        window.electron.ipcRenderer.send(SendEnum.SET_AUTO_LAUNCH, autoLaunchSetting.enabled)
      }
      window.electron.ipcRenderer.send(SendEnum.SET_LOCAL_FORAGE, nextSettings)
      return persistSetting(key, value, scope)
    },
    [persistSetting]
  )

  /** 设置当前激活模型 */
  const setActiveModel = useCallback(
    async (modelId: string): Promise<boolean> => {
      const isSaved = await updateSetting('activeModelId', modelId, 'model')
      if (!isSaved) {
        toast.error('当前模型保存失败，请重试')
      }
      return isSaved
    },
    [updateSetting]
  )

  /** 更新指定模型字段 */
  const updateModelField = useCallback(
    (modelId: string, key: ModelFieldKey, value: string): void => {
      const nextModels = settingsRef.current.models.map((model) =>
        model.id === modelId ? { ...model, [key]: value } : model
      )
      void updateSetting('models', nextModels, 'model')
    },
    [updateSetting]
  )

  /** 新增自定义模型配置 */
  const addCustomModel = useCallback((): TranslationModelProfile => {
    const modelSerial = getNextCustomModelSerial(settingsRef.current.models)
    const newModel: TranslationModelProfile = {
      id: `custom-${uuidV4()}`,
      displayName: `自定义模型 ${modelSerial}`,
      baseUrl: 'https://api.openai.com/v1',
      model: '',
      apiKey: ''
    }
    const nextModels = [...settingsRef.current.models, newModel]
    void updateSetting('models', nextModels, 'model').then((isSaved) => {
      if (isSaved) {
        toast.success('已新增自定义模型，请完成配置')
        return
      }
      toast.error('新增模型保存失败，请重试')
    })
    return newModel
  }, [updateSetting])

  /** 删除自定义模型 */
  const removeCustomModel = useCallback(
    async (modelId: string): Promise<boolean> => {
      const current = settingsRef.current
      const nextModels = current.models.filter((model) => model.id !== modelId)
      const isRemovingActiveModel = current.activeModelId === modelId
      const nextActiveModelId = isRemovingActiveModel ? DEFAULT_ACTIVE_MODEL_ID : current.activeModelId
      const saveResults = await Promise.all([
        updateSetting('models', nextModels, 'model'),
        ...(isRemovingActiveModel ? [updateSetting('activeModelId', nextActiveModelId, 'model')] : [])
      ])
      const isSaved = saveResults.every(Boolean)
      toast[isSaved ? 'success' : 'error'](isSaved ? '删除模型成功' : '删除模型保存失败，请重试')
      return isSaved
    },
    [updateSetting]
  )

  /** 重置模型配置为默认内置方案 */
  const resetModelSettings = useCallback(async (): Promise<boolean> => {
    const defaultModels = createDefaultModelProfiles()
    const saveResults = await Promise.all([
      updateSetting('models', defaultModels, 'model'),
      updateSetting('activeModelId', DEFAULT_ACTIVE_MODEL_ID, 'model')
    ])
    const isSaved = saveResults.every(Boolean)
    toast[isSaved ? 'success' : 'error'](isSaved ? '模型配置已重置' : '重置保存失败，请重试')
    return isSaved
  }, [updateSetting])

  // 当前激活模型对象
  const activeModel =
    settings.models.find((item) => item.id === settings.activeModelId) || null

  return (
    <AppSettingsContext.Provider
      value={{
        settings,
        isReady,
        activeModel,
        saveStatusByScope,
        updateSetting,
        setActiveModel,
        updateModelField,
        addCustomModel,
        removeCustomModel,
        resetModelSettings
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  )
}

/**
 * 读取全局共享的应用设置与操作方法
 * @returns 共享设置上下文
 */
export function useAppSettings(): AppSettingsContextValue {
  const context = useContext(AppSettingsContext)
  if (!context) {
    throw new Error('useAppSettings 必须在 AppSettingsProvider 内部使用')
  }
  return context
}
