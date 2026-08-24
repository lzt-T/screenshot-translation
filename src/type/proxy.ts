/** 应用代理模式 */
export type ProxyMode = 'system' | 'direct' | 'manual'

/** 应用代理设置 */
export interface ProxySetting {
  /* 代理模式 */
  mode: ProxyMode
  /* 手动代理地址 */
  proxyUrl: string
}
