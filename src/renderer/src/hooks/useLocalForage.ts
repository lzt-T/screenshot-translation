import React, { useCallback, useEffect, useState } from 'react'
import { Model, ModelName, GeminiModel, GlmModel, TargetLanguage, GptModel, AutoLaunchSetting, BuiltInFreeModel } from '@src/type/model'
import localForage from 'localforage'

export interface StoreSetting {
  targetLanguage: TargetLanguage
  activeModel: ModelName
  apiKeys: {
    [key in Model]: string
  }
  autoLaunch: AutoLaunchSetting
}

export default function useLocalForage() {
  /** 设置 */
  const [storeSetting, setStoreSetting] = useState<StoreSetting>({
    targetLanguage: TargetLanguage.ZH_CN,
    activeModel: BuiltInFreeModel.GLM_4_FLASH_250414_FREE,
    apiKeys: {
      [Model.GEMINI]: '',
      [Model.GLM]: '',
      [Model.GPT]: '',
      [Model.DEEP_SEEK]: '',
      [Model.BUILT_IN_FREE]: ''
    },
    autoLaunch: {
      enabled: false
    }
  })

  /** 是否初始化 */
  const [isInit, setIsInit] = useState(true)

  /** 初始化 */
  const onInit = useCallback(async () => {
    let result: StoreSetting = {
      targetLanguage: TargetLanguage.ZH_CN,
      activeModel: BuiltInFreeModel.GLM_4_FLASH_250414_FREE,
      apiKeys: {
        [Model.GEMINI]: '',
        [Model.GLM]: '',
        [Model.GPT]: '',
        [Model.DEEP_SEEK]: '',
        [Model.BUILT_IN_FREE]: ''
      },
      autoLaunch: {
        enabled: false
      }
    }
    const apiKeys = await localForage.getItem('apiKeys')
    const activeModel = await localForage.getItem('activeModel')
    const targetLanguage = await localForage.getItem('targetLanguage')
    const autoLaunch = await localForage.getItem('autoLaunch')

    if (activeModel) {
      result.activeModel = activeModel as unknown as GeminiModel | GlmModel | GptModel | BuiltInFreeModel
    }

    if (apiKeys) {
      result.apiKeys = apiKeys as { [key in Model]: string }
    }

    if (targetLanguage) {
      result.targetLanguage = targetLanguage as TargetLanguage
    }

    if (autoLaunch) {
      result.autoLaunch = autoLaunch as AutoLaunchSetting
    }

    setStoreSetting(result)

    setIsInit(false)
  }, [])

  useEffect(() => {
    onInit()
  }, [])

  return {
    isInit,
    storeSetting,
  }
}
