import type { ProxySetting } from '../type/proxy'

// 默认代理设置
export const DEFAULT_PROXY_SETTING: ProxySetting = {
  mode: 'system',
  proxyUrl: ''
}

// 支持的代理协议
const SUPPORTED_PROXY_PROTOCOLS = new Set(['http:', 'https:', 'socks4:', 'socks5:'])

/**
 * 校验手动代理地址
 * @param proxyUrl 手动代理地址
 * @returns 校验错误，无错误时为空字符串
 */
export function getProxyValidationMessage(proxyUrl: string): string {
  if (!proxyUrl.trim()) {
    return '请输入代理地址'
  }

  try {
    // 标准化后的代理地址
    const parsedUrl = new URL(proxyUrl)
    if (!SUPPORTED_PROXY_PROTOCOLS.has(parsedUrl.protocol)) {
      return '仅支持 HTTP、HTTPS、SOCKS4 或 SOCKS5 代理'
    }
    if (!parsedUrl.hostname || !parsedUrl.port) {
      return '代理地址需要包含主机和端口'
    }
    return ''
  } catch {
    return '代理地址格式不正确'
  }
}
