import { desktopCapturer, screen } from 'electron';
import { screenshotWindow } from '../windowClasses/screenshotWindow';

/**
 * 获取屏幕截图
 * @param bounds 截图区域
 * @returns 截图数据
 */
export async function captureArea(bounds) {
  try {
    const display = screenshotWindow.currentDisplay;
    if (!display) {
      throw new Error('No display found');
    }

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: display.size.width * display.scaleFactor,
        height: display.size.height * display.scaleFactor
      }
    })

    let findInd = 0;
    for (let i = 0; i < sources.length; i++) {
      if (sources[i].display_id === display?.id.toString()) {
        findInd = i;
        break;
      }
    }

    if (!sources || sources.length === 0) {
      throw new Error('No screen source found');
    }
    const source = sources[findInd];
    const thumbnail = source.thumbnail; // NativeImage

    // 计算缩放比例 (缩略图像素 / 屏幕逻辑像素)
    const scaleX = thumbnail.getSize().width / display.size.width;
    const scaleY = thumbnail.getSize().height / display.size.height;
    console.log('captureArea:', {
      actualThumbSize: thumbnail.getSize(),
      calculatedScale: { x: scaleX, y: scaleY }
    });

    // 计算正确的裁剪区域 (在缩略图上的像素坐标)
    const cropBounds = {
      x: Math.round(bounds.x * scaleX),
      y: Math.round(bounds.y * scaleY),
      width: Math.round(bounds.width * scaleX),
      height: Math.round(bounds.height * scaleY)
    };

    // 1. 执行裁剪
    const croppedScreenshot = thumbnail.crop(cropBounds);

    // 2. 将裁剪后的图像调整为截图选框的逻辑像素大小
    const targetWidth = Math.round(bounds.width);
    const targetHeight = Math.round(bounds.height);

    // 检查裁剪后的图像是否有效
    if (croppedScreenshot.isEmpty()) {
      throw new Error('croppedScreenshot is empty!');
    }
    // 检查目标尺寸是否有效
    if (targetWidth <= 0 || targetHeight <= 0) {
      throw new Error(`invalid target size: ${targetWidth}x${targetHeight}`);
    }

    const resizedScreenshot = croppedScreenshot.resize({
      width: targetWidth,
      height: targetHeight,
      quality: 'best' // 使用最佳质量
    });

    // 3. 返回调整大小后的图像数据
    return resizedScreenshot.toDataURL();
  } catch (error) {
    throw error; // 重新抛出错误，让调用者处理
  }
}
