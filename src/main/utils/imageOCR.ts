import fs from 'fs'
import path from 'path'
import { app } from 'electron' // 导入 app
import { createWorker, PSM, OEM } from 'tesseract.js'

// 定义文本块的接口
interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface TextBlock {
  text: string
  boundingBox: BoundingBox
}

/**
 * 使用OCR识别图像中的文字及其位置
 * @param {string} imageDataUrl 图像的base64数据URL
 * @returns {Promise<{success: boolean, textBlocks: TextBlock[]}>} 识别到的文本块数组，包含文本和位置信息
 */
async function extractTextFromImage(imageDataUrl) {
  try {
    const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '')
    const imageBuffer = Buffer.from(base64Data, 'base64')
    let tempDir = ''

    // 开发环境 ，将图像保存到临时目录
    if (!app.isPackaged) {
      tempDir = path.join(__dirname, '../../temp')
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }
      const tempImage = path.join(tempDir, `ocr_${Date.now()}.png`)
      fs.writeFileSync(tempImage, imageBuffer)
    }

    const worker = await createWorker('eng+chi_sim')
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT
    })

    // 识别图像
    const result = await worker.recognize(
      imageBuffer,
      {},
      {
        blocks: true, // 请求块级数据
        hocr: true, // 请求 HOCR 数据
        tsv: true // 请求 TSV 数据
      }
    )

    await worker.terminate()

    // 处理结果
    let textBlocks: TextBlock[] = []

    if (result && result.data && Array.isArray(result.data.blocks)) {
      // 遍历所有检测到的文本块
      for (const block of result.data.blocks) {
        if (block && Array.isArray(block.paragraphs)) {
          // 遍历当前块中的所有段落
          for (const paragraph of block.paragraphs) {
            if (paragraph && paragraph.text && paragraph.bbox) {
              console.log('处理段落:', {
                text: paragraph.text.substring(0, 50) + '...',
                bbox: paragraph.bbox
              })
              textBlocks.push({
                text: paragraph.text,
                boundingBox: {
                  x: paragraph.bbox.x0,
                  y: paragraph.bbox.y0,
                  width: paragraph.bbox.x1 - paragraph.bbox.x0,
                  height: paragraph.bbox.y1 - paragraph.bbox.y0
                }
              })
            } else {
            }
          }
        } else {
        }
      }

      //合并函数
      textBlocks = mergeAdjacentTextBlocks(textBlocks)
    }

    return {
      success: true,
      textBlocks: textBlocks,
      msg: 'OCR识别成功'
    }
  } catch (error: any) {
    throw error
  }
}

/**
 * 根据几何邻近性和对齐方式合并可能属于同一段落的文本块。
 * 允许一个块与后续多个满足条件的块合并。
 * @param {Array<TextBlock>} textBlocks - 从 OCR 提取的原始文本块数组。
 * @returns {Array<TextBlock>} 合并后的文本块数组。
 */
function mergeAdjacentTextBlocks(textBlocks) {
  if (!textBlocks || textBlocks.length < 2) {
    return textBlocks
  }

  // 创建一个可变副本以存储合并结果和跟踪状态
  const mutableBlocks = textBlocks.map((block) => ({ ...block })) // 深拷贝
  const isMerged = new Array(mutableBlocks.length).fill(false)

  for (let i = 0; i < mutableBlocks.length; i++) {
    if (isMerged[i]) continue
    let currentBlock = mutableBlocks[i]
    if (!currentBlock.boundingBox || currentBlock.boundingBox.height <= 0) continue

    for (let j = i + 1; j < mutableBlocks.length; j++) {
      if (isMerged[j]) continue
      let nextBlock = mutableBlocks[j]
      if (!nextBlock.boundingBox || nextBlock.boundingBox.height <= 0) continue

      const verticalGap =
        nextBlock.boundingBox.y - (currentBlock.boundingBox.y + currentBlock.boundingBox.height)

      // --- 检查条件 (使用方法一 + 水平重叠判断) ---
      const MAX_VERTICAL_GAP_FACTOR = 1.5

      // 计算水平重叠
      const currentLeft = currentBlock.boundingBox.x
      const currentRight = currentBlock.boundingBox.x + currentBlock.boundingBox.width
      const nextLeft = nextBlock.boundingBox.x
      const nextRight = nextBlock.boundingBox.x + nextBlock.boundingBox.width
      const overlapsHorizontally = currentLeft < nextRight && nextLeft < currentRight

      const shouldMerge =
        verticalGap >= 0 &&
        verticalGap < nextBlock.boundingBox.height * MAX_VERTICAL_GAP_FACTOR &&
        overlapsHorizontally // <--- 使用水平重叠判断

      if (shouldMerge) {
        currentBlock.text = (currentBlock.text || '').trim() + '\n' + (nextBlock.text || '').trim()

        // 更新 currentBlock 的 bounding box 以包含 nextBlock
        const mergedX = Math.min(currentBlock.boundingBox.x, nextBlock.boundingBox.x)
        const mergedY = currentBlock.boundingBox.y // Y 坐标保持不变
        const mergedWidth =
          Math.max(
            currentBlock.boundingBox.x + currentBlock.boundingBox.width,
            nextBlock.boundingBox.x + nextBlock.boundingBox.width
          ) - mergedX
        const mergedHeight = nextBlock.boundingBox.y + nextBlock.boundingBox.height - mergedY

        // 更新 mutableBlocks[i] 的 boundingBox (因为 currentBlock 是它的引用)
        currentBlock.boundingBox = {
          x: mergedX,
          y: mergedY,
          width: mergedWidth,
          height: mergedHeight
        }

        // 标记 nextBlock 为已合并
        isMerged[j] = true
      }
    }
  }

  // 收集所有未被合并的块作为最终结果
  const finalMergedBlocks = mutableBlocks.filter((_, index) => !isMerged[index])

  return finalMergedBlocks
}

// 使用 module.exports 导出
export { extractTextFromImage }
