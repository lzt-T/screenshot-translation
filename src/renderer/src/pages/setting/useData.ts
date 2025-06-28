import useLocalForage, { StoreSetting } from "@renderer/hooks/useLocalForage"
import { useCallback, useEffect, useState } from "react"
import _ from 'lodash'
import { GeminiModel, Model, TargetLanguage } from "@src/type/model"
import { SendEnum } from "@src/type/ipc-constants"
import localForage from 'localforage'

export default function useData() {

  const { storeSetting, isInit} = useLocalForage()

  /** 数据是否初始化 */
  const [dataIsInit, setDataIsInit] = useState(false)

  /** 数据 */
  const [data, setData] = useState<StoreSetting>({
    targetLanguage: TargetLanguage.ZH_CN,
    activeModel: GeminiModel.GEMINI_2_0_FLASH,
    apiKeys: {
      [Model.GEMINI]: '',
      [Model.GLM]: '',
      [Model.GPT]: '',
      [Model.DEEP_SEEK]: ''
    },
    autoLaunch: {
      enabled: false
    }
  })


  /** 修改数据 */
  const changeData = useCallback((key: keyof StoreSetting, value: any) => {
    setData(data => {
      return {
        ...data,
        [key]: value
      }
    })
    localForage.setItem(key, value)
    if (key === 'autoLaunch') {
      window.electron.ipcRenderer.send(SendEnum.SET_AUTO_LAUNCH, value.enabled)
    }
  }, [])

  useEffect(() => {
    if (dataIsInit) {
      window.electron.ipcRenderer.send(SendEnum.SET_LOCAL_FORAGE, data)
    }
  }, [data])


  /** 初始化数据 */
  useEffect(() => {
    if (!isInit) {
      const data = _.cloneDeep(storeSetting)
      setData(data)
      setTimeout(() => {
        setDataIsInit(true)
      }, 300)
    }
  }, [isInit])

  return {
    data,
    changeData,
    dataIsInit
  }
}