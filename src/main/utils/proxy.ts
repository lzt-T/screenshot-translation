import { session, type ProxyConfig } from 'electron'
import type { ProxyMode, ProxySetting } from '../../type/proxy'
import { DEFAULT_PROXY_SETTING, getProxyValidationMessage } from '../../utils/proxy'

// 代理模式对应的 Electron 配置策略
const PROXY_CONFIG_STRATEGY_MAP: Record<ProxyMode, (setting: ProxySetting) => ProxyConfig> = {
  system: () => ({ mode: 'system' }),
  direct: () => ({ mode: 'direct' }),
  manual: (setting) => ({ mode: 'fixed_servers', proxyRules: setting.proxyUrl.trim() })
}

/**
 * 将应用代理设置应用到 Electron 默认会话
 * @param setting 应用代理设置
 * @returns 设置完成时结束
 */
export async function applyProxySetting(
  setting: ProxySetting = DEFAULT_PROXY_SETTING
): Promise<void> {
  if (setting.mode === 'manual') {
    // 手动代理地址错误
    const validationMessage = getProxyValidationMessage(setting.proxyUrl)
    if (validationMessage) {
      return
    }
  }

  await session.defaultSession.setProxy(PROXY_CONFIG_STRATEGY_MAP[setting.mode](setting))
}
