/** 更新检查完成结果 */
export interface UpdateCheckCompleteResult {
  /* 是否存在可用更新 */
  isUpdateAvailable: boolean
  /* 检查失败时的错误信息 */
  errorMessage?: string
}

/** 可用更新信息 */
export interface UpdateAvailableInfo {
  /* 新版本号 */
  version: string
}

/** 更新下载进度 */
export interface UpdateProgress {
  /* 总大小 */
  total: number
  /* 已下载大小 */
  delta: number
  /* 已下载大小 */
  transferred: number
  /* 下载进度 */
  percent: number
  /* 下载速度 */
  bytesPerSecond: number
}
