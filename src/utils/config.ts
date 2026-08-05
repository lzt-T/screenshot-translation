/** 最小结果窗口宽度 */
const MIN_RESULT_WINDOW_WIDTH = 220
/** 最小结果窗口高度 */
const MIN_RESULT_WINDOW_HEIGHT = 70
/** 结果弹窗操作栏高度 */
const RESULT_WINDOW_BAR_HEIGHT = 36
/** 截图窗口检查光标显示器的间隔时间 */
const SCREENSHOT_WINDOW_DISPLAY_CHECK_INTERVAL = 150

/** 获取窗口布局配置 */
export const getConfig = () => {
  return {
    MIN_RESULT_WINDOW_WIDTH,
    MIN_RESULT_WINDOW_HEIGHT,
    RESULT_WINDOW_BAR_HEIGHT,
    SCREENSHOT_WINDOW_DISPLAY_CHECK_INTERVAL,
  }
}
