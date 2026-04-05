import useLocalForage, { StoreSetting } from '@renderer/hooks/useLocalForage'
import { useCallback, useEffect, useState } from 'react'
import _ from 'lodash'
import { Language } from '@src/type/base'
import { SendEnum } from '@src/type/ipc-constants'
import localForage from 'localforage'
import { createDefaultModelProfiles, DEFAULT_ACTIVE_MODEL_ID } from '@src/utils/modelProfiles'

/**
 * 设置页数据 Hook
 * @returns {{data: StoreSetting, changeData: Function, dataIsInit: boolean}} 设置页状态
 */
export default function useData() {
  // 本地存储设置
  const { storeSetting, isInit } = useLocalForage()

  // 数据是否初始化
  const [dataIsInit, setDataIsInit] = useState(false)

  // 设置页数据
  const [data, setData] = useState<StoreSetting>({
    targetLanguage: Language.ZH,
    activeModelId: DEFAULT_ACTIVE_MODEL_ID,
    models: createDefaultModelProfiles(),
    autoLaunch: {
      enabled: false
    }
  })

  /**
   * 修改设置数据
   * @param {keyof StoreSetting} key 字段名
   * @param {unknown} value 字段值
   * @returns {void} 无返回值
   */
  const changeData = useCallback((key: keyof StoreSetting, value: any) => {
    setData((data) => {
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

  /**
   * 数据变更后同步到主进程
   * @returns {void} 无返回值
   */
  useEffect(() => {
    if (dataIsInit) {
      console.log('data', data)
      window.electron.ipcRenderer.send(SendEnum.SET_LOCAL_FORAGE, data)
    }
  }, [data])

  /**
   * 初始化设置页数据
   * @returns {void} 无返回值
   */
  useEffect(() => {
    if (!isInit) {
      // 克隆本地存储数据
      const data = _.cloneDeep(storeSetting)

      console.log('storeSetting', storeSetting)
      setData(data)
      requestAnimationFrame(() => {
        setDataIsInit(true)
      })
    }
  }, [isInit])

  return {
    data,
    changeData,
    dataIsInit
  }
}
