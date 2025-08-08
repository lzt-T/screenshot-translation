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
