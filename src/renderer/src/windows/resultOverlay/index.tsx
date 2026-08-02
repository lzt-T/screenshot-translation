import { useEffect, useRef, useState } from 'react'
import { SendEnum } from '@src/type/ipc-constants'
import { TextType } from '@src/type/base'
import type { SaveLearningItemInput } from '@src/type/learning'
import { getTextType } from '@src/utils/ai'
import {
  findLearningItem,
  removeLearningItem,
  saveLearningItem
} from '@renderer/services/learning-service'
import { CopyButton, FooterContainer, OverlayContainer, TranslatedTextOverlay } from './style'

/** 文本边界框 */
interface BoundingBox {
  /* 横坐标 */
  x: number
  /* 纵坐标 */
  y: number
  /* 宽度 */
  width: number
  /* 高度 */
  height: number
}

/** 翻译文本块 */
interface TextBlock {
  /* 文本块 ID */
  id: string
  /* 原始文本 */
  text: string
  /* 翻译文本 */
  translation: string
  /* 是否是单行 */
  isSingleLine: boolean
  /* 文本边界框 */
  boundingBox: BoundingBox
  /* 可选警告信息 */
  warning?: string
}

/** 翻译结果数据 */
interface ResultData {
  /* 是否翻译成功 */
  success: boolean
  /* 翻译文本块 */
  textBlocks: TextBlock[]
  /* 可选结果信息 */
  msg?: string
}

/** 浮层原图显示模式 */
type OverlayMode = 'show-original' | 'hide-original'

/**
 * 渲染原始截图翻译结果浮层
 * @returns {React.JSX.Element} 翻译结果浮层
 */
export default function ResultOverlay(): React.JSX.Element {
  // 可展示的翻译文本块
  const [blocksToRender, setBlocksToRender] = useState<TextBlock[]>([])
  // 当前原图显示模式
  const [overlayMode, setOverlayMode] = useState<OverlayMode>('show-original')
  // 原始文本
  const originalText = useRef('')
  // 翻译文本
  const translatedText = useRef('')
  // 已收藏记录 ID
  const [bookmarkedItemId, setBookmarkedItemId] = useState<string | null>(null)
  // 是否正在保存收藏
  const [isBookmarkSaving, setIsBookmarkSaving] = useState(false)
  // 收藏操作错误状态
  const [hasBookmarkError, setHasBookmarkError] = useState(false)
  /** 当前收藏查询编号 */
  const activeBookmarkRequestId = useRef(0)

  /**
   * 创建当前截图收藏参数
   * @returns 截图学习收藏参数
   */
  function createScreenshotLearningInput(): SaveLearningItemInput {
    return {
      kind: getTextType(originalText.current) === TextType.WORD ? 'word' : 'sentence',
      source: 'screenshot',
      originalText: originalText.current,
      translatedText: translatedText.current
    }
  }

  /**
   * 复制指定文本并通知主进程
   * @param {string} text 待复制文本
   * @returns {void} 无返回值
   */
  function handleCopyText(text: string): void {
    navigator.clipboard.writeText(text)
    window.electron.ipcRenderer.send(SendEnum.COPY_TEXT_SUCCESS)
  }

  /**
   * 复制原文
   * @returns {void} 无返回值
   */
  function copyOriginalText(): void {
    handleCopyText(originalText.current)
  }

  /**
   * 复制译文
   * @returns {void} 无返回值
   */
  function copyTranslatedText(): void {
    handleCopyText(translatedText.current)
  }

  /**
   * 切换原图显示状态
   * @returns {void} 无返回值
   */
  function toggleOverlayMode(): void {
    setOverlayMode((mode) => (mode === 'show-original' ? 'hide-original' : 'show-original'))
  }

  /** 切换当前截图翻译的收藏状态 */
  async function toggleBookmark(): Promise<void> {
    if (!originalText.current || !translatedText.current || isBookmarkSaving) {
      return
    }

    setIsBookmarkSaving(true)
    setHasBookmarkError(false)
    try {
      if (bookmarkedItemId) {
        await removeLearningItem(bookmarkedItemId)
        setBookmarkedItemId(null)
        return
      }

      // 保存后的截图收藏
      const savedItem = await saveLearningItem(createScreenshotLearningInput())
      setBookmarkedItemId(savedItem.id)
    } catch {
      setHasBookmarkError(true)
    } finally {
      setIsBookmarkSaving(false)
    }
  }

  /** 接收并整理翻译结果 */
  useEffect(() => {
    window.electron.ipcRenderer.on(
      SendEnum.DISPLAY_TRANSLATION_RESULT,
      (_event, arg: { result: ResultData }) => {
        // 收到的翻译结果
        const result = arg.result
        setBlocksToRender([])

        if (result?.success && result.textBlocks?.length > 0) {
          // 边界信息有效的翻译文本块
          const validBlocks = result.textBlocks.filter(
            (block) =>
              block.translation &&
              block.boundingBox &&
              typeof block.boundingBox.x === 'number' &&
              typeof block.boundingBox.y === 'number' &&
              typeof block.boundingBox.width === 'number' &&
              typeof block.boundingBox.height === 'number'
          )
          setBlocksToRender(validBlocks)
          originalText.current = validBlocks.map((block) => block.text || '').join('\n')
          translatedText.current = validBlocks.map((block) => block.translation || '').join('\n')
          return
        }

        console.log('[ResultOverlay] 收到不成功的结果或无文本块。错误弹窗应处理显示。')
      }
    )

    return () => {
      window.electron.ipcRenderer.removeAllListeners(SendEnum.DISPLAY_TRANSLATION_RESULT)
    }
  }, [])

  /** 截图翻译结果变化后同步收藏状态 */
  useEffect(() => {
    activeBookmarkRequestId.current += 1
    // 本次收藏查询编号
    const requestId = activeBookmarkRequestId.current
    setBookmarkedItemId(null)
    setHasBookmarkError(false)

    if (blocksToRender.length === 0) {
      return
    }

    void findLearningItem(createScreenshotLearningInput())
      .then((item) => {
        if (requestId === activeBookmarkRequestId.current) {
          setBookmarkedItemId(item?.id || null)
        }
      })
      .catch(() => {
        if (requestId === activeBookmarkRequestId.current) {
          setHasBookmarkError(true)
        }
      })
  }, [blocksToRender])

  /** 监听 Escape 键关闭浮层 */
  useEffect(() => {
    /**
     * 处理浮层键盘事件
     * @param {KeyboardEvent} event 键盘事件
     * @returns {void} 无返回值
     */
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        window.electron.ipcRenderer.send(SendEnum.RESULT_WINDOW_CLOSE)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <OverlayContainer $overlayMode={overlayMode}>
      {blocksToRender.map((block) => (
        <TranslatedTextOverlay
          key={block.id}
          style={{
            left: `${block.boundingBox.x}px`,
            top: `${block.boundingBox.y}px`,
            width: `${block.boundingBox.width}px`,
            whiteSpace: block.isSingleLine ? 'nowrap' : 'pre-wrap'
          }}
        >
          {block.translation}
        </TranslatedTextOverlay>
      ))}
      <FooterContainer>
        <CopyButton onClick={toggleOverlayMode} type="button">
          {overlayMode === 'show-original' ? '隐藏原图' : '显示原图'}
        </CopyButton>
        <CopyButton onClick={copyOriginalText} type="button">
          复制原文
        </CopyButton>
        <CopyButton onClick={copyTranslatedText} type="button">
          复制译文
        </CopyButton>
        <CopyButton
          aria-pressed={Boolean(bookmarkedItemId)}
          disabled={isBookmarkSaving}
          onClick={toggleBookmark}
          type="button"
        >
          {isBookmarkSaving
            ? '保存中'
            : hasBookmarkError
              ? '收藏失败，重试'
              : bookmarkedItemId
                ? '取消收藏'
                : '收藏'}
        </CopyButton>
      </FooterContainer>
    </OverlayContainer>
  )
}
