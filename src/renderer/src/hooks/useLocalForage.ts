import React, { useCallback, useEffect, useState } from 'react'
import { SendEnum } from '@src/type/ipc-constants'
import { Model, ModelName, GeminiModel, GlmModel, TargetLanguage, GptModel } from '@src/type/model'
import localForage from 'localforage'

interface StoreSetting {
  targetLanguage: TargetLanguage
  activeModel: ModelName
  apiKeys: {
    [key in Model]: string
  }
}

export default function useLocalForage() {
  /** 设置 */
  const [storeSetting, setStoreSetting] = useState<StoreSetting>({
    targetLanguage: TargetLanguage.ZH_CN,
    activeModel: GeminiModel.GEMINI_2_0_FLASH,
    apiKeys: {
      [Model.GEMINI]: '',
      [Model.GLM]: '',
      [Model.GPT]: '',
      [Model.DEEP_SEEK]: ''
    }
  })

  const [isInit, setIsInit] = useState(true)

  /** 设置 */
  const changeStoreSetting = useCallback((setting: StoreSetting) => {
    localForage.setItem('targetLanguage', setting.targetLanguage)
    localForage.setItem('activeModel', setting.activeModel)
    localForage.setItem('apiKeys', setting.apiKeys)
    setStoreSetting(setting)
  }, [])

  /** 保存*/
  const saveStoreSetting = useCallback(() => {
    window.electron.ipcRenderer.send(SendEnum.SET_LOCAL_FORAGE, storeSetting)
  }, [storeSetting])

  /** 初始化 */
  const onInit = useCallback(async () => {
    let result: StoreSetting = {
      targetLanguage: TargetLanguage.ZH_CN,
      activeModel: GeminiModel.GEMINI_2_0_FLASH,
      apiKeys: {
        [Model.GEMINI]: '',
        [Model.GLM]: '',
        [Model.GPT]: '',
        [Model.DEEP_SEEK]: ''
      }
    }
    const apiKeys = await localForage.getItem('apiKeys')
    const activeModel = await localForage.getItem('activeModel')
    const targetLanguage = await localForage.getItem('targetLanguage')

    if (activeModel) {
      result.activeModel = activeModel as unknown as GeminiModel | GlmModel | GptModel
    }

    if (apiKeys) {
      result.apiKeys = apiKeys as { [key in Model]: string }
    }

    if (targetLanguage) {
      result.targetLanguage = targetLanguage as TargetLanguage
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
    changeStoreSetting,
    saveStoreSetting
  }
}
