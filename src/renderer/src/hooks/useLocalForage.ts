export type { StoreSetting } from '@renderer/contexts/AppSettingsContext'
import { useAppSettings } from '@renderer/contexts/AppSettingsContext'

/**
 * 本地存储设置 Hook（转发自全局设置上下文，确保跨页面状态实时一致）
 * @returns 设置初始化状态与配置内容
 */
export default function useLocalForage() {
  const { settings, isReady } = useAppSettings()
  return {
    isInit: !isReady,
    storeSetting: settings
  }
}
