import { useCallback, useEffect, useState } from 'react'
import { AutoLaunchSetting, TranslationModelProfile } from '@src/type/model'
import { Language } from '@src/type/base'
import localForage from 'localforage'
import { createDefaultModelProfiles, DEFAULT_ACTIVE_MODEL_ID } from '@src/utils/modelProfiles'
import type { ProxySetting } from '@src/type/proxy'
import { DEFAULT_PROXY_SETTING } from '@src/utils/proxy'

export interface StoreSetting {
  targetLanguage: Language
  activeModelId: string
  models: TranslationModelProfile[]
  autoLaunch: AutoLaunchSetting
  proxy: ProxySetting
}

/**
 * 本地存储设置 Hook
 * @returns {{isInit: boolean, storeSetting: StoreSetting}} 设置状态与设置内容
 */
export default function useLocalForage() {
  // 默认设置
  const defaultSetting: StoreSetting = {
    targetLanguage: Language.ZH,
    activeModelId: DEFAULT_ACTIVE_MODEL_ID,
    models: createDefaultModelProfiles(),
    autoLaunch: {
      enabled: false
    },
    proxy: DEFAULT_PROXY_SETTING
  }

  // 设置数据
  const [storeSetting, setStoreSetting] = useState<StoreSetting>({
    ...defaultSetting
  })

  // 是否初始化
  const [isInit, setIsInit] = useState(true)

  /**
   * 初始化本地设置
   * @returns {Promise<void>} 异步初始化结果
   */
  const onInit = useCallback(async () => {
    // 初始化结果
    const result: StoreSetting = {
      ...defaultSetting
    }
    // 本地模型配置
    const models = await localForage.getItem('models')
    // 本地激活模型 ID
    const activeModelId = await localForage.getItem('activeModelId')
    // 本地目标语言
    const targetLanguage = await localForage.getItem('targetLanguage')
    // 本地开机自启动配置
    const autoLaunch = await localForage.getItem('autoLaunch')
    // 本地代理配置
    const proxy = await localForage.getItem('proxy')

    if (activeModelId) {
      result.activeModelId = activeModelId as string
    }

    if (models) {
      result.models = models as TranslationModelProfile[]
    }

    if (targetLanguage) {
      result.targetLanguage = targetLanguage as Language
    }

    if (autoLaunch) {
      result.autoLaunch = autoLaunch as AutoLaunchSetting
    }

    if (proxy) {
      result.proxy = proxy as ProxySetting
    }

    setStoreSetting(result)

    setIsInit(false)
  }, [])

  useEffect(() => {
    onInit()
  }, [onInit])

  return {
    isInit,
    storeSetting
  }
}
