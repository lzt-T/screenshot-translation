import { nativeImage } from 'electron'

// Electron 原始位图的每像素字节数
const BITMAP_BYTES_PER_PIXEL = 4
// 暗色图像的平均亮度阈值
const DARK_IMAGE_BRIGHTNESS_THRESHOLD = 128

/**
 * 将截图转换为适合 OCR 的高对比度灰度图
 * @param imageBuffer 原始截图 Buffer
 * @returns 保持原尺寸的 OCR 图像 Buffer
 */
export function prepareImageForOcr(imageBuffer: Buffer): Buffer {
  // 待处理的原始图像
  const image = nativeImage.createFromBuffer(imageBuffer)
  // 原始图像尺寸
  const { width, height } = image.getSize()
  // 原始位图像素数据
  const bitmap = image.toBitmap()
  // 所有像素的亮度总和
  let brightnessSum = 0

  // 累计像素最亮颜色通道，保留彩色文字对比度
  for (let offset = 0; offset < bitmap.length; offset += BITMAP_BYTES_PER_PIXEL) {
    brightnessSum += Math.max(bitmap[offset], bitmap[offset + 1], bitmap[offset + 2])
  }

  // 图像平均亮度
  const averageBrightness = brightnessSum / (bitmap.length / BITMAP_BYTES_PER_PIXEL)
  // 是否需要反相以生成浅色背景
  const shouldInvert = averageBrightness < DARK_IMAGE_BRIGHTNESS_THRESHOLD

  // 将每个像素转换为高对比度灰度值
  for (let offset = 0; offset < bitmap.length; offset += BITMAP_BYTES_PER_PIXEL) {
    // 当前像素的最亮颜色通道
    const brightness = Math.max(bitmap[offset], bitmap[offset + 1], bitmap[offset + 2])
    // 适配背景明暗的灰度值
    const grayscale = shouldInvert ? 255 - brightness : brightness
    bitmap[offset] = grayscale
    bitmap[offset + 1] = grayscale
    bitmap[offset + 2] = grayscale
  }

  return nativeImage.createFromBitmap(bitmap, { width, height }).toPNG()
}
