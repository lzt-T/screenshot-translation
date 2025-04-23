import React, { useCallback, useEffect, useState } from 'react'
import { SendEnum } from '@src/type/ipc-constants'
import { Model } from '@src/type/model'
import localForage from 'localforage'

interface StoreSetting {
  activeModel: Model
  apiKeys: {
    [key in Model]: string
  }
}

export default function useLocalForage() {
  /** 设置 */
  const [storeSetting, setStoreSetting] = useState<StoreSetting>({
    activeModel: Model.GEMINI,
    apiKeys: {
      [Model.GEMINI]: '',
      [Model.GLM]: ''
    }
  })

  const [isInit, setIsInit] = useState(true)

  /** 设置 */
  const changeStoreSetting = useCallback((setting: StoreSetting) => {
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
    let result = {
      activeModel: Model.GEMINI,
      apiKeys: {
        [Model.GEMINI]: '',
        [Model.GLM]: ''
      }
    }
    const apiKeys = await localForage.getItem('apiKeys')
    const activeModel = await localForage.getItem('activeModel')

    if (activeModel) {
      result.activeModel = activeModel as Model
    }

    if (apiKeys) {
      result.apiKeys = apiKeys as { [key in Model]: string }
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
