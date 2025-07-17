import fs from 'fs'
import path from 'path'
import { app } from 'electron' // 导入 app
import { createWorker, PSM } from 'tesseract.js'

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
  /** 是否是单行 */
  isSingleLine: boolean
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

    // 生产环境，使用资源路径
    const langPath = app.isPackaged
      ? process.resourcesPath
      : path.resolve('./')
      
    // 创建 OCR 工作器
    const worker = await createWorker('eng+chi_sim', 1, {
      langPath,
      gzip: false,
    });

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
              textBlocks.push({
                isSingleLine: true,
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

/** 是否可以合并文本块 */
function canMergeTextBlock(currentBlock: TextBlock, nextBlock: TextBlock) {
  const HORIZONTAL_TOLERANCE = 5; // 水平容错值 (像素)
  const VERTICAL_TOLERANCE = 5;   // 垂直容错值 (像素)

  /** 垂直方向上可不可以合并 */
  let verticalCanMerge = false
  /** 水平方向上可不可以合并 */
  let horizontalCanMerge = false

  // --- 垂直合并逻辑 ---
  const verticalGap = nextBlock.boundingBox.y - (currentBlock.boundingBox.y + currentBlock.boundingBox.height)
  const MAX_VERTICAL_GAP_FACTOR = 1 // 最大垂直间隙容忍度（基于下一个块的高度）

  const currentLeft = currentBlock.boundingBox.x
  const currentRight = currentBlock.boundingBox.x + currentBlock.boundingBox.width
  const nextLeft = nextBlock.boundingBox.x
  const nextRight = nextBlock.boundingBox.x + nextBlock.boundingBox.width

  // 水平重叠判断 (考虑容错)
  const overlapsHorizontally =
    currentLeft < nextRight + HORIZONTAL_TOLERANCE &&
    nextLeft < currentRight + HORIZONTAL_TOLERANCE

  verticalCanMerge =
    verticalGap >= -VERTICAL_TOLERANCE && // 允许一定的垂直方向上的负间隙（轻微重叠）
    verticalGap < nextBlock.boundingBox.height * MAX_VERTICAL_GAP_FACTOR &&
    overlapsHorizontally

  // --- 水平合并逻辑 ---
  const horizontalGap = nextBlock.boundingBox.x - (currentBlock.boundingBox.x + currentBlock.boundingBox.width)

  const MAX_HORIZONTAL_GAP_FACTOR = 1
  const currentTop = currentBlock.boundingBox.y
  const currentBottom = currentBlock.boundingBox.y + currentBlock.boundingBox.height
  const nextTop = nextBlock.boundingBox.y
  const nextBottom = nextBlock.boundingBox.y + nextBlock.boundingBox.height

  // 垂直重叠判断 (考虑容错)
  const overlapsVertically =
    currentTop < nextBottom + VERTICAL_TOLERANCE &&
    nextTop < currentBottom + VERTICAL_TOLERANCE

  horizontalCanMerge =
    horizontalGap >= -HORIZONTAL_TOLERANCE && // 允许一定的水平方向上的负间隙（轻微重叠）
    horizontalGap < currentBlock.boundingBox.height * MAX_HORIZONTAL_GAP_FACTOR && // 示例：水平间隙小于当前块高度的2倍
    overlapsVertically

  if (verticalCanMerge) {
    return { canMerge: true, type: 'vertical' as const };
  }
  if (horizontalCanMerge) {
    return { canMerge: true, type: 'horizontal' as const };
  }
  return { canMerge: false, type: null };
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

      const mergeInfo = canMergeTextBlock(currentBlock, nextBlock);

      if (mergeInfo.canMerge) {
        const currentText = currentBlock.text || ''
        const nextText = nextBlock.text || ''
        let mergedX, mergedY, mergedWidth, mergedHeight;

        //垂直合并
        if (mergeInfo.type === 'vertical') {
          currentBlock.text = currentText.trim() + nextText.trim();
          currentBlock.isSingleLine = false;

          mergedX = Math.min(currentBlock.boundingBox.x, nextBlock.boundingBox.x);
          mergedY = currentBlock.boundingBox.y; 
          mergedWidth = Math.max(
            currentBlock.boundingBox.x + currentBlock.boundingBox.width,
            nextBlock.boundingBox.x + nextBlock.boundingBox.width
          ) - mergedX;
          mergedHeight = (nextBlock.boundingBox.y + nextBlock.boundingBox.height) - mergedY;

        }
        //水平合并
        else if (mergeInfo.type === 'horizontal') {
          currentBlock.text = currentText.trim() + nextText.trim()
          mergedX = currentBlock.boundingBox.x; 
          mergedY = Math.min(currentBlock.boundingBox.y, nextBlock.boundingBox.y);
          mergedWidth = (nextBlock.boundingBox.x + nextBlock.boundingBox.width) - mergedX;
          mergedHeight = Math.max(
            currentBlock.boundingBox.y + currentBlock.boundingBox.height,
            nextBlock.boundingBox.y + nextBlock.boundingBox.height
          ) - mergedY;
        }

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
