import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { createWorker, PSM } from 'tesseract.js'
import { prepareImageForOcr } from './ocr-image-preprocessor'

// OCR 包围盒
interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

// 文本块合并调试信息（仅主进程内部使用）
interface MergeDebugInfo {
  sourceCount: number
  mergeRounds: number
  sumSourceHeights: number
  hasVerticalMerge: boolean
}

export interface TextBlock {
  text: string
  boundingBox: BoundingBox
  /** 是否是单行 */
  isSingleLine: boolean
  /** 合并调试信息，仅用于排查 */
  mergeDebug?: MergeDebugInfo
}

// OCR Worker 实例类型
type TesseractWorker = Awaited<ReturnType<typeof createWorker>>

// OCR Worker 单例
let ocrWorker: TesseractWorker | null = null
// OCR Worker 初始化中的 Promise，避免并发重复初始化
let ocrWorkerInitPromise: Promise<TesseractWorker> | null = null

// CJK 字符判断
const CJK_CHAR_REGEX = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/
// 英文数字判断
const LATIN_ALNUM_REGEX = /[A-Za-z0-9]/
// 文本日志最大长度
const TEXT_LOG_MAX_LENGTH = 120
// 合并判定：水平容错（像素）
const OCR_MERGE_HORIZONTAL_TOLERANCE = 2
// 合并判定：垂直容错（像素）
const OCR_MERGE_VERTICAL_TOLERANCE = 2
// 合并判定：正向垂直间距系数（基于行高）
const OCR_MERGE_POSITIVE_VERTICAL_GAP_FACTOR = 1
// 合并判定：最小高度比例（next/current）
const OCR_MERGE_MIN_HEIGHT_RATIO = 0.65
// 合并判定：最大高度比例（next/current）
const OCR_MERGE_MAX_HEIGHT_RATIO = 1.6
// 合并判定：水平间距系数（基于当前块高度）
const OCR_MERGE_MAX_HORIZONTAL_GAP_FACTOR = 1

// OCR 日志阶段
type OcrLogStage = 'raw-blocks' | 'merged-blocks'

/**
 * 获取 OCR 语言文件路径
 * @returns {string} 语言路径
 */
function getLangPath(): string {
  return app.isPackaged ? process.resourcesPath : path.resolve('./')
}

/**
 * 获取文本首字符
 * @param {string} text 文本
 * @returns {string} 首字符
 */
function getFirstChar(text: string): string {
  return (text || '').trim().charAt(0)
}

/**
 * 获取文本尾字符
 * @param {string} text 文本
 * @returns {string} 尾字符
 */
function getLastChar(text: string): string {
  // 去除首尾空白后的文本
  const normalizedText = (text || '').trim()
  return normalizedText.charAt(normalizedText.length - 1)
}

/**
 * 是否是 CJK 字符
 * @param {string} char 单字符
 * @returns {boolean} 是否是 CJK
 */
function isCjkChar(char: string): boolean {
  return CJK_CHAR_REGEX.test(char)
}

/**
 * 是否是英文或数字字符
 * @param {string} char 单字符
 * @returns {boolean} 是否是英文或数字
 */
function isLatinOrNumber(char: string): boolean {
  return LATIN_ALNUM_REGEX.test(char)
}

/**
 * 按语言特征拼接文本，避免英文粘连并保持中英文可读性
 * @param {string} leftText 左侧文本
 * @param {string} rightText 右侧文本
 * @returns {string} 拼接后的文本
 */
function joinTextByLanguage(leftText: string, rightText: string): string {
  // 左侧规范化文本
  const normalizedLeftText = (leftText || '').trim()
  // 右侧规范化文本
  const normalizedRightText = (rightText || '').trim()

  if (!normalizedLeftText) {
    return normalizedRightText
  }
  if (!normalizedRightText) {
    return normalizedLeftText
  }

  // 左侧尾字符
  const lastChar = getLastChar(normalizedLeftText)
  // 右侧首字符
  const firstChar = getFirstChar(normalizedRightText)

  // 中日韩字符相邻默认不补空格
  if (isCjkChar(lastChar) && isCjkChar(firstChar)) {
    return `${normalizedLeftText}${normalizedRightText}`
  }

  // 英文/数字连续片段补空格，防止 wordword 粘连
  if (isLatinOrNumber(lastChar) && isLatinOrNumber(firstChar)) {
    return `${normalizedLeftText} ${normalizedRightText}`
  }

  // 中英交界补单空格，提升可读性
  if (
    (isCjkChar(lastChar) && isLatinOrNumber(firstChar)) ||
    (isLatinOrNumber(lastChar) && isCjkChar(firstChar))
  ) {
    return `${normalizedLeftText} ${normalizedRightText}`
  }

  return `${normalizedLeftText}${normalizedRightText}`
}

/**
 * 构建初始调试信息
 * @returns {MergeDebugInfo} 调试信息
 */
function createInitialDebugInfo(): MergeDebugInfo {
  return {
    sourceCount: 1,
    mergeRounds: 0,
    sumSourceHeights: 0,
    hasVerticalMerge: false
  }
}

/**
 * 基于几何顺序排序文本块
 * @param {TextBlock[]} textBlocks 文本块
 * @returns {TextBlock[]} 排序后的文本块
 */
function sortTextBlocks(textBlocks: TextBlock[]): TextBlock[] {
  return [...textBlocks].sort((a, b) => {
    // 两个文本块的垂直距离
    const yGap = a.boundingBox.y - b.boundingBox.y
    if (Math.abs(yGap) > 6) {
      return yGap
    }
    return a.boundingBox.x - b.boundingBox.x
  })
}

/**
 * 确保 OCR Worker 已初始化
 * @returns {Promise<TesseractWorker>} OCR Worker
 */
async function ensureOcrWorker(): Promise<TesseractWorker> {
  if (ocrWorker) {
    return ocrWorker
  }

  if (ocrWorkerInitPromise) {
    return ocrWorkerInitPromise
  }

  ocrWorkerInitPromise = (async () => {
    try {
      // OCR worker 语言路径
      const langPath = getLangPath()
      // OCR worker 实例
      const worker = await createWorker('eng+chi_sim', 1, {
        langPath,
        gzip: false
      })

      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT
      })

      ocrWorker = worker
      return worker
    } catch (error) {
      // 错误文本
      const errorText = error instanceof Error ? error.message : String(error)
      throw new Error(`OCR 初始化失败: ${errorText}`)
    }
  })()

  try {
    return await ocrWorkerInitPromise
  } finally {
    ocrWorkerInitPromise = null
  }
}

/**
 * 预热 OCR Worker
 * @returns {Promise<void>} 无返回值
 */
export async function initializeOcrWorker(): Promise<void> {
  await ensureOcrWorker()
}

/**
 * 释放 OCR Worker
 * @returns {Promise<void>} 无返回值
 */
export async function terminateOcrWorker(): Promise<void> {
  if (!ocrWorker) {
    return
  }

  try {
    await ocrWorker.terminate()
  } finally {
    ocrWorker = null
    ocrWorkerInitPromise = null
  }
}

/**
 * 使用 OCR 识别图像中的文字及其位置
 * @param {string} imageDataUrl 图像的 base64 数据 URL
 * @returns {Promise<{success: boolean, textBlocks: TextBlock[], msg: string}>} 识别结果
 */
async function extractTextFromImage(imageDataUrl: string) {
  try {
    // 图片 base64 正文
    const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '')
    // 图片 Buffer
    const imageBuffer = Buffer.from(base64Data, 'base64')

    // 开发环境将图像保存到临时目录，便于调试 OCR
    if (!app.isPackaged) {
      // 临时目录路径
      const tempDir = path.join(__dirname, '../../temp')
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }
      // 临时图片路径
      const tempImage = path.join(tempDir, `ocr_${Date.now()}.png`)
      fs.writeFileSync(tempImage, imageBuffer)
    }

    // 保持原尺寸的 OCR 高对比度图像
    const ocrImageBuffer = prepareImageForOcr(imageBuffer)

    // 复用 OCR Worker
    const worker = await ensureOcrWorker()

    // OCR 识别结果
    const result = await worker.recognize(
      ocrImageBuffer,
      {},
      {
        blocks: true,
        hocr: true,
        tsv: true
      }
    )

    // 识别到的文本块
    let textBlocks: TextBlock[] = []

    if (result?.data && Array.isArray(result.data.blocks)) {
      for (const block of result.data.blocks) {
        if (!block || !Array.isArray(block.paragraphs)) {
          continue
        }

        for (const paragraph of block.paragraphs) {
          if (!paragraph?.text || !paragraph?.bbox) {
            continue
          }

          textBlocks.push({
            isSingleLine: true,
            text: paragraph.text,
            boundingBox: {
              x: paragraph.bbox.x0,
              y: paragraph.bbox.y0,
              width: paragraph.bbox.x1 - paragraph.bbox.x0,
              height: paragraph.bbox.y1 - paragraph.bbox.y0
            },
            mergeDebug: {
              ...createInitialDebugInfo(),
              sumSourceHeights: paragraph.bbox.y1 - paragraph.bbox.y0
            }
          })
        }
      }

      // 合并前原始块日志（开发环境）
      logTextBlocks('raw-blocks', textBlocks)
      // 文本块排序后再合并，提升几何邻近判断稳定性
      const sortedTextBlocks = sortTextBlocks(textBlocks)
      textBlocks = mergeAdjacentTextBlocks(sortedTextBlocks)
      // 合并后块日志（开发环境）
      logTextBlocks('merged-blocks', textBlocks)
    }

    return {
      success: true,
      textBlocks,
      msg: 'OCR识别成功'
    }
  } catch (error) {
    // 错误文本
    const errorText = error instanceof Error ? error.message : String(error)
    if (errorText.includes('OCR 初始化失败')) {
      throw new Error(errorText)
    }
    throw new Error(`OCR 识别失败: ${errorText}`)
  }
}

/** 是否可以合并文本块 */
function canMergeTextBlock(currentBlock: TextBlock, nextBlock: TextBlock) {
  // 垂直方向间隙
  const verticalGap =
    nextBlock.boundingBox.y - (currentBlock.boundingBox.y + currentBlock.boundingBox.height)

  // 当前文本块左边界
  const currentLeft = currentBlock.boundingBox.x
  // 当前文本块右边界
  const currentRight = currentBlock.boundingBox.x + currentBlock.boundingBox.width
  // 候选文本块左边界
  const nextLeft = nextBlock.boundingBox.x
  // 候选文本块右边界
  const nextRight = nextBlock.boundingBox.x + nextBlock.boundingBox.width

  // 水平重叠判断（考虑容错）
  const overlapsHorizontally =
    currentLeft < nextRight + OCR_MERGE_HORIZONTAL_TOLERANCE &&
    nextLeft < currentRight + OCR_MERGE_HORIZONTAL_TOLERANCE

  // 当前聚合块的平均行高估算
  const currentSourceCount = Math.max(currentBlock.mergeDebug?.sourceCount || 1, 1)
  // 当前聚合块的原始高度总和
  const sumSourceHeights = Math.max(
    currentBlock.mergeDebug?.sumSourceHeights || currentBlock.boundingBox.height,
    1
  )
  // 当前聚合块的估算行高
  const estimatedCurrentLineHeight = sumSourceHeights / currentSourceCount
  // 候选块高度
  const nextBlockHeight = Math.max(nextBlock.boundingBox.height, 1)
  // 当前估算行高（防止除 0）
  const currentLineHeight = Math.max(estimatedCurrentLineHeight, 1)
  // 高度比例（next/current）
  const heightRatio = nextBlockHeight / currentLineHeight
  // 高度是否在可合并区间
  const heightComparable =
    heightRatio >= OCR_MERGE_MIN_HEIGHT_RATIO &&
    heightRatio <= OCR_MERGE_MAX_HEIGHT_RATIO
  // 正向垂直间距上限（仅正 gap 生效）
  const positiveGapLimit =
    Math.max(nextBlockHeight, estimatedCurrentLineHeight) *
      OCR_MERGE_POSITIVE_VERTICAL_GAP_FACTOR +
    OCR_MERGE_VERTICAL_TOLERANCE

  // 垂直邻近判定：
  // 1) gap <= 0：视为重叠/贴合，水平重叠即可合并
  // 2) gap > 0：使用正向间距上限进行容错判定
  const verticalCanMerge =
    heightComparable &&
    overlapsHorizontally &&
    (verticalGap <= 0 || verticalGap <= positiveGapLimit)

  // 水平方向间隙
  const horizontalGap =
    nextBlock.boundingBox.x - (currentBlock.boundingBox.x + currentBlock.boundingBox.width)

  // 当前文本块上边界
  const currentTop = currentBlock.boundingBox.y
  // 当前文本块下边界
  const currentBottom = currentBlock.boundingBox.y + currentBlock.boundingBox.height
  // 候选文本块上边界
  const nextTop = nextBlock.boundingBox.y
  // 候选文本块下边界
  const nextBottom = nextBlock.boundingBox.y + nextBlock.boundingBox.height

  // 垂直重叠判断（考虑容错）
  const overlapsVertically =
    currentTop < nextBottom + OCR_MERGE_VERTICAL_TOLERANCE &&
    nextTop < currentBottom + OCR_MERGE_VERTICAL_TOLERANCE

  // 水平邻近判定
  const horizontalCanMerge =
    heightComparable &&
    horizontalGap >= -OCR_MERGE_HORIZONTAL_TOLERANCE &&
    horizontalGap < currentBlock.boundingBox.height * OCR_MERGE_MAX_HORIZONTAL_GAP_FACTOR &&
    overlapsVertically

  if (!verticalCanMerge && !horizontalCanMerge) {
    return { canMerge: false, mergeAxis: null }
  }

  if (verticalCanMerge && horizontalCanMerge) {
    // 同时满足时用位移方向做决策，减少同一行文本被判成竖向合并
    const deltaX = Math.abs(nextBlock.boundingBox.x - currentBlock.boundingBox.x)
    // 两个文本块的垂直位移
    const deltaY = Math.abs(nextBlock.boundingBox.y - currentBlock.boundingBox.y)
    return {
      canMerge: true,
      mergeAxis: deltaY > deltaX ? ('vertical' as const) : ('horizontal' as const)
    }
  }

  return {
    canMerge: true,
    mergeAxis: verticalCanMerge ? ('vertical' as const) : ('horizontal' as const)
  }
}

/**
 * 合并两个包围盒为并集
 * @param {BoundingBox} firstBox 第一个包围盒
 * @param {BoundingBox} secondBox 第二个包围盒
 * @returns {BoundingBox} 合并后包围盒
 */
function mergeBoundingBoxes(firstBox: BoundingBox, secondBox: BoundingBox): BoundingBox {
  // 并集左上角
  const mergedX = Math.min(firstBox.x, secondBox.x)
  // 并集上边界
  const mergedY = Math.min(firstBox.y, secondBox.y)
  // 并集右下角
  const mergedRight = Math.max(firstBox.x + firstBox.width, secondBox.x + secondBox.width)
  // 并集下边界
  const mergedBottom = Math.max(firstBox.y + firstBox.height, secondBox.y + secondBox.height)

  return {
    x: mergedX,
    y: mergedY,
    width: mergedRight - mergedX,
    height: mergedBottom - mergedY
  }
}

/**
 * 合并调试信息
 * @param {MergeDebugInfo} currentDebug 当前调试信息
 * @param {MergeDebugInfo} nextDebug 下一个调试信息
 * @returns {MergeDebugInfo} 合并后调试信息
 */
function mergeDebugInfo(
  currentDebug: MergeDebugInfo,
  nextDebug: MergeDebugInfo,
  mergeAxis: 'vertical' | 'horizontal'
): MergeDebugInfo {
  return {
    sourceCount: currentDebug.sourceCount + nextDebug.sourceCount,
    mergeRounds: currentDebug.mergeRounds + nextDebug.mergeRounds + 1,
    sumSourceHeights: currentDebug.sumSourceHeights + nextDebug.sumSourceHeights,
    hasVerticalMerge:
      currentDebug.hasVerticalMerge || nextDebug.hasVerticalMerge || mergeAxis === 'vertical'
  }
}

/**
 * 规范化日志文本
 * @param {string} text 原始文本
 * @returns {string} 日志文本
 */
function normalizeTextForLog(text: string): string {
  // 规范化文本
  const normalizedText = (text || '').replace(/\s+/g, ' ').trim()
  if (normalizedText.length <= TEXT_LOG_MAX_LENGTH) {
    return normalizedText
  }
  return `${normalizedText.slice(0, TEXT_LOG_MAX_LENGTH)}...`
}

/**
 * 构建文本块摘要
 * @param {TextBlock[]} textBlocks 文本块
 * @returns {{count: number, totalTextLength: number, avgWidth: number, avgHeight: number}} 摘要信息
 */
function buildTextBlocksSummary(textBlocks: TextBlock[]) {
  // 块数量
  const count = textBlocks.length
  // 文本总长度
  const totalTextLength = textBlocks.reduce((sum, block) => sum + (block.text || '').length, 0)
  // 总宽度
  const totalWidth = textBlocks.reduce((sum, block) => sum + (block.boundingBox?.width || 0), 0)
  // 总高度
  const totalHeight = textBlocks.reduce((sum, block) => sum + (block.boundingBox?.height || 0), 0)
  // 平均宽度
  const avgWidth = count > 0 ? Number((totalWidth / count).toFixed(2)) : 0
  // 平均高度
  const avgHeight = count > 0 ? Number((totalHeight / count).toFixed(2)) : 0

  return {
    count,
    totalTextLength,
    avgWidth,
    avgHeight
  }
}

/**
 * 打印文本块日志（仅开发环境）
 * @param {OcrLogStage} stage 日志阶段
 * @param {TextBlock[]} textBlocks 文本块
 * @returns {void} 无返回值
 */
function logTextBlocks(stage: OcrLogStage, textBlocks: TextBlock[]): void {
  // if (app.isPackaged) {
  //   return
  // }

  // 阶段摘要
  const summary = buildTextBlocksSummary(textBlocks)
  console.log(`[OCR][${stage}] summary`, summary)

  textBlocks.forEach((block, index) => {
    // 块包围盒
    const boundingBox = block.boundingBox || { x: 0, y: 0, width: 0, height: 0 }
    console.log(`[OCR][${stage}] block`, {
      index,
      text: normalizeTextForLog(block.text || ''),
      boundingBox: {
        x: boundingBox.x,
        y: boundingBox.y,
        width: boundingBox.width,
        height: boundingBox.height
      },
      isSingleLine: block.isSingleLine,
      mergeDebug: block.mergeDebug || createInitialDebugInfo()
    })
  })
}

/**
 * 根据几何邻近性和对齐方式合并可能属于同一段落的文本块
 * @param {TextBlock[]} textBlocks OCR 提取的文本块
 * @returns {TextBlock[]} 合并后的文本块
 */
function mergeAdjacentTextBlocks(textBlocks: TextBlock[]): TextBlock[] {
  if (!textBlocks || textBlocks.length < 2) {
    return textBlocks
  }

  // 标准化块副本
  const normalizedBlocks = textBlocks.map((block) => ({
    ...block,
    mergeDebug: block.mergeDebug || createInitialDebugInfo()
  }))
  // 访问标记
  const visited = new Array(normalizedBlocks.length).fill(false)
  // 合并结果
  const mergedResultBlocks: TextBlock[] = []

  for (let i = 0; i < normalizedBlocks.length; i++) {
    if (visited[i]) continue
    // 当前合并簇的种子文本块
    const seedBlock = normalizedBlocks[i]
    if (!seedBlock.boundingBox || seedBlock.boundingBox.height <= 0) continue

    visited[i] = true

    // 当前聚合块
    const clusterBlock: TextBlock = {
      ...seedBlock,
      mergeDebug: seedBlock.mergeDebug || createInitialDebugInfo()
    }

    // 闭包增长标记
    let hasExpanded = true
    while (hasExpanded) {
      hasExpanded = false

      for (let j = 0; j < normalizedBlocks.length; j++) {
        if (visited[j]) continue
        // 当前待判断的候选文本块
        const candidateBlock = normalizedBlocks[j]
        if (!candidateBlock.boundingBox || candidateBlock.boundingBox.height <= 0) continue

        // 用融合后的 cluster 与候选块做邻近判定
        const mergeDecision = canMergeTextBlock(clusterBlock, candidateBlock)
        if (!mergeDecision.canMerge || !mergeDecision.mergeAxis) continue

        // 融合文本与包围盒
        const mergedText = joinTextByLanguage(clusterBlock.text || '', candidateBlock.text || '')
        // 合并后的包围盒
        const mergedBoundingBox = mergeBoundingBoxes(
          clusterBlock.boundingBox,
          candidateBlock.boundingBox
        )
        // 合并后的调试信息
        const mergedDebug = mergeDebugInfo(
          clusterBlock.mergeDebug || createInitialDebugInfo(),
          candidateBlock.mergeDebug || createInitialDebugInfo(),
          mergeDecision.mergeAxis
        )

        clusterBlock.text = mergedText
        clusterBlock.boundingBox = mergedBoundingBox
        clusterBlock.mergeDebug = mergedDebug
        clusterBlock.isSingleLine = !mergedDebug.hasVerticalMerge

        visited[j] = true
        hasExpanded = true
      }
    }

    mergedResultBlocks.push(clusterBlock)
  }

  return mergedResultBlocks
}

export { extractTextFromImage }
