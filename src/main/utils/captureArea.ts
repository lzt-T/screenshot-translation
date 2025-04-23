import { desktopCapturer,screen } from 'electron';

/**
 * 获取屏幕截图
 * @param bounds 截图区域
 * @returns 截图数据
 */
export async function captureArea(bounds) {
  try {
    const display = screen.getPrimaryDisplay();
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: display.size.width * display.scaleFactor,
        height: display.size.height * display.scaleFactor
      }
    });

    if (!sources || sources.length === 0) {
      throw new Error('找不到屏幕源');
    }
    const source = sources[0];
    const thumbnail = source.thumbnail; // NativeImage

    // 计算缩放比例 (缩略图像素 / 屏幕逻辑像素)
    const scaleX = thumbnail.getSize().width / display.size.width;
    const scaleY = thumbnail.getSize().height / display.size.height;
    console.log('屏幕截图信息:', {
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

    console.log('用户选择的截图区域 (逻辑像素):', bounds);
    console.log('计算出的裁剪区域 (缩略图像素):', cropBounds);

    // 1. 执行裁剪
    const croppedScreenshot = thumbnail.crop(cropBounds);
    console.log('图像已裁剪，裁剪后尺寸 (缩略图像素):', croppedScreenshot.getSize());

    // 2. 将裁剪后的图像调整为截图选框的逻辑像素大小
    const targetWidth = Math.round(bounds.width);
    const targetHeight = Math.round(bounds.height);

    // 检查裁剪后的图像是否有效
    if (croppedScreenshot.isEmpty()) {
      console.log('错误：裁剪后的图像为空！');
      throw new Error('裁剪图像失败，结果为空。');
    }
    // 检查目标尺寸是否有效
    if (targetWidth <= 0 || targetHeight <= 0) {
      console.log(`错误：无效的目标尺寸 ${targetWidth}x${targetHeight}`);
      throw new Error(`无效的目标调整尺寸：${targetWidth}x${targetHeight}`);
    }


    console.log(`将裁剪图像调整大小为: ${targetWidth}x${targetHeight}`);
    const resizedScreenshot = croppedScreenshot.resize({
      width: targetWidth,
      height: targetHeight,
      quality: 'best' // 使用最佳质量
    });
    console.log('图像已调整大小，最终尺寸:', resizedScreenshot.getSize());

    // 3. 返回调整大小后的图像数据
    return resizedScreenshot.toDataURL();
  } catch (error) {
    console.error('截图或调整大小错误:', error);
    throw error; // 重新抛出错误，让调用者处理
  }
}