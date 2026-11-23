import { useAppSettings } from '@renderer/contexts/AppSettingsContext'

export type { SaveStatus, SaveStatusByScope, SettingSaveScope } from '@renderer/contexts/AppSettingsContext'

/**
 * 设置页数据与模型配置流程
 * @returns 设置页状态和操作方法
 */
export default function useData() {
  const {
    settings,
    isReady,
    saveStatusByScope,
    updateSetting,
    setActiveModel,
    updateModelField,
    addCustomModel,
    removeCustomModel,
    resetModelSettings
  } = useAppSettings()

  return {
    data: settings,
    changeData: updateSetting,
    setActiveModel,
    updateModelField,
    addCustomModel,
    removeCustomModel,
    resetModelSettings,
    dataIsInit: isReady,
    saveStatusByScope
  }
}
