/**
 * @fileoverview 系统相关工具函数
 */
import AutoLaunch from 'auto-launch'
import { showNotification } from './notification'
import { NoticeType } from '../../type/notice'
import { is } from '@electron-toolkit/utils'
import path from 'path'


// 创建自启动实例
const autoLauncher = new AutoLaunch({
  name: 'Bai_Ze',
  path: process.execPath,
  isHidden: false
});

/**
 * @description 设置开机自启动
 * @param enabled 是否启用
 */
export const setAutoLaunch = (enabled: boolean): void => {
  try {
    if (enabled) {
      autoLauncher.enable()
        .then(() => {
          return autoLauncher.isEnabled();
        })
        .then((isEnabled) => {
          if (!isEnabled) {
            showNotification('开机自启动设置可能未生效', NoticeType.WARNING);
          }
        })
        .catch((_err) => {
          showNotification('启用开机自启动失败', NoticeType.ERROR);
        });
    } else {
      autoLauncher.disable()
        .then(() => {
        })
        .catch((_err) => {
          showNotification('禁用开机自启动失败', NoticeType.ERROR);
        });
    }
  } catch (error) {
    showNotification('设置开机自启动失败', NoticeType.ERROR);
  }
}


/**
 * @description 获取icon路径
 * @returns 返回icon路径
 */
export const getIconPath = (): string => {
  return is.dev
    ? path.join(__dirname, '../../resources/icon.png')
    : path.join(process.resourcesPath, 'resources/icon.png')
}
