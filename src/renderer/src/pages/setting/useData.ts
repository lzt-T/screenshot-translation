import useLocalForage, { StoreSetting } from '@renderer/hooks/useLocalForage'
import { useCallback, useEffect, useRef, useState } from 'react'
import _ from 'lodash'
import { Language } from '@src/type/base'
import { SendEnum } from '@src/type/ipc-constants'
import localForage from 'localforage'
import { DEFAULT_PROXY_SETTING } from '@src/utils/proxy'
import { createDefaultModelProfiles, DEFAULT_ACTIVE_MODEL_ID } from '@src/utils/modelProfiles'
import { ModelFieldKey, TranslationModelProfile } from '@src/type/model'
import { v4 as uuidV4 } from 'uuid'
import { toast } from 'sonner'

/** 自动保存状态 */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

/**
 * 获取下一个自定义模型序号
 * @param models 当前模型列表
 * @returns 不重复的模型序号
 */
const getNextCustomModelSerial = (models: TranslationModelProfile[]): number => {
  // 已使用的自定义模型序号
  const usedSerials = models
    .filter((model) => !model.isBuiltInFree)
    .map((model) => model.displayName?.match(/^自定义模型 (\d+)$/)?.[1])
    .filter((serial): serial is string => Boolean(serial))
    .map(Number)
  return Math.max(0, ...usedSerials) + 1
}

/**
 * 设置页数据与模型配置流程
 * @returns 设置页状态和操作方法
 */
export default function useData() {
  // 本地存储设置
  const { storeSetting, isInit } = useLocalForage()
  // 数据是否初始化
  const [dataIsInit, setDataIsInit] = useState(false)
  // 自动保存状态
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  // 正在执行的保存数量
  const pendingSaveCountRef = useRef(0)
  // 当前保存批次是否失败
  const hasSaveErrorRef = useRef(false)
  // 串行保存队列
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())
  // 设置页数据
  const [data, setData] = useState<StoreSetting>({
    targetLanguage: Language.ZH,
    activeModelId: DEFAULT_ACTIVE_MODEL_ID,
    models: createDefaultModelProfiles(),
    autoLaunch: {
      enabled: false
    },
    proxy: DEFAULT_PROXY_SETTING
  })

  /**
   * 将单项设置写入本地存储
   * @param key 设置字段
   * @param value 设置值
   * @returns 保存是否成功
   */
  const persistSetting = useCallback(
    async <TKey extends keyof StoreSetting>(
      key: TKey,
      value: StoreSetting[TKey]
    ): Promise<boolean> => {
      if (pendingSaveCountRef.current === 0) {
        hasSaveErrorRef.current = false
      }
      pendingSaveCountRef.current += 1
      setSaveStatus('saving')

      // 当前设置保存任务
      const saveTask = saveQueueRef.current.then(async (): Promise<boolean> => {
        try {
          await localForage.setItem(key, value)
          return true
        } catch {
          hasSaveErrorRef.current = true
          return false
        } finally {
          pendingSaveCountRef.current -= 1
          if (pendingSaveCountRef.current === 0) {
            setSaveStatus(hasSaveErrorRef.current ? 'error' : 'saved')
          }
        }
      })
      saveQueueRef.current = saveTask.then(() => undefined)
      return saveTask
    },
    []
  )

  /**
   * 修改设置数据
   * @param key 字段名
   * @param value 字段值
   * @returns 保存是否成功
   */
  const changeData = useCallback(
    <TKey extends keyof StoreSetting>(key: TKey, value: StoreSetting[TKey]): Promise<boolean> => {
      setData((currentData) => ({
        ...currentData,
        [key]: value
      }))
      if (key === 'autoLaunch') {
        // 开机自启动设置
        const autoLaunchSetting = value as StoreSetting['autoLaunch']
        window.electron.ipcRenderer.send(SendEnum.SET_AUTO_LAUNCH, autoLaunchSetting.enabled)
      }
      return persistSetting(key, value)
    },
    [persistSetting]
  )

  /**
   * 设置当前使用模型
   * @param modelId 模型 ID
   * @returns 保存是否成功
   */
  const setActiveModel = useCallback(
    async (modelId: string): Promise<boolean> => {
      // 保存结果
      const isSaved = await changeData('activeModelId', modelId)
      if (!isSaved) {
        toast.error('当前模型保存失败，请重试')
      }
      return isSaved
    },
    [changeData]
  )

  /**
   * 更新模型单字段
   * @param modelId 模型 ID
   * @param key 字段名
   * @param value 字段值
   * @returns 无返回值
   */
  const updateModelField = useCallback(
    (modelId: string, key: ModelFieldKey, value: string): void => {
      // 更新后的模型配置列表
      const nextModels = data.models.map((model) => {
        if (model.id !== modelId) {
          return model
        }
        return {
          ...model,
          [key]: value
        }
      })
      void changeData('models', nextModels)
    },
    [changeData, data.models]
  )

  /**
   * 新增一个自定义模型
   * @returns 新增的模型配置
   */
  const addCustomModel = useCallback((): TranslationModelProfile => {
    // 新模型序号
    const modelSerial = getNextCustomModelSerial(data.models)
    // 新增模型配置
    const newModel: TranslationModelProfile = {
      id: `custom-${uuidV4()}`,
      displayName: `自定义模型 ${modelSerial}`,
      baseUrl: 'https://api.openai.com/v1',
      model: '',
      apiKey: ''
    }
    // 更新后的模型列表
    const nextModels = [...data.models, newModel]
    void changeData('models', nextModels).then((isSaved) => {
      if (isSaved) {
        toast.success('已新增自定义模型，请完成配置')
        return
      }
      toast.error('新增模型保存失败，请重试')
    })
    return newModel
  }, [changeData, data.models])

  /**
   * 删除自定义模型
   * @param modelId 模型 ID
   * @returns 删除是否保存成功
   */
  const removeCustomModel = useCallback(
    async (modelId: string): Promise<boolean> => {
      // 过滤后的模型列表
      const nextModels = data.models.filter((model) => model.id !== modelId)
      // 是否删除当前模型
      const isRemovingActiveModel = data.activeModelId === modelId
      // 下一当前模型 ID
      const nextActiveModelId = isRemovingActiveModel ? DEFAULT_ACTIVE_MODEL_ID : data.activeModelId
      // 保存结果列表
      const saveResults = await Promise.all([
        changeData('models', nextModels),
        ...(isRemovingActiveModel ? [changeData('activeModelId', nextActiveModelId)] : [])
      ])
      // 保存是否全部成功
      const isSaved = saveResults.every(Boolean)
      toast[isSaved ? 'success' : 'error'](isSaved ? '删除模型成功' : '删除模型保存失败，请重试')
      return isSaved
    },
    [changeData, data.activeModelId, data.models]
  )

  /**
   * 重置模型相关配置
   * @returns 重置是否保存成功
   */
  const resetModelSettings = useCallback(async (): Promise<boolean> => {
    // 默认模型配置列表
    const defaultModels = createDefaultModelProfiles()
    // 保存结果列表
    const saveResults = await Promise.all([
      changeData('models', defaultModels),
      changeData('activeModelId', DEFAULT_ACTIVE_MODEL_ID)
    ])
    // 保存是否全部成功
    const isSaved = saveResults.every(Boolean)
    toast[isSaved ? 'success' : 'error'](isSaved ? '模型配置已重置' : '重置保存失败，请重试')
    return isSaved
  }, [changeData])

  /** 数据变更后同步到主进程 */
  useEffect(() => {
    if (dataIsInit) {
      window.electron.ipcRenderer.send(SendEnum.SET_LOCAL_FORAGE, data)
    }
  }, [data, dataIsInit])

  /** 初始化设置页数据 */
  useEffect(() => {
    if (!isInit) {
      // 本地设置副本
      const storedData = _.cloneDeep(storeSetting)
      setData(storedData)
      requestAnimationFrame(() => {
        setDataIsInit(true)
      })
    }
  }, [isInit, storeSetting])

  return {
    data,
    changeData,
    setActiveModel,
    updateModelField,
    addCustomModel,
    removeCustomModel,
    resetModelSettings,
    dataIsInit,
    saveStatus
  }
}
