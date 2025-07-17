import { Notification } from 'electron'
import path from 'path'
import { NoticeType } from '../../type/notice'
import { is } from '@electron-toolkit/utils'

let currentNotification: Notification | null = null

export function showNotification(
  /** 消息 */
  message: string,
  /** 类型 */
  type: NoticeType = NoticeType.INFO,
  /** 是否静音 */
  silent: boolean = false
): void {
  if (currentNotification) {
    currentNotification.close()
  }

  let title: string

  switch (type) {
    case NoticeType.SUCCESS:
      title = '成功'
      break
    case NoticeType.WARNING:
      title = '警告'
      break
    case NoticeType.ERROR:
      title = '错误'
      break
    default:
      title = '通知'
  }

  const icon = is.dev
    ? path.join(__dirname, '../../resources/icon.png')
    : path.join(process.resourcesPath, 'resources/icon.png')

  currentNotification = new Notification({
    title,
    body: message,
    icon,
    silent
  })

  currentNotification.on('close', () => {
    currentNotification = null
  })

  currentNotification.show()
}
