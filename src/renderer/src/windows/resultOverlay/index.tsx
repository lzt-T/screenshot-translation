import { useEffect, useRef, useState } from 'react'
import { SendEnum } from '@src/type/ipc-constants'
import { TextType } from '@src/type/base'
import type { SaveLearningItemInput } from '@src/type/learning'
import { getTextType } from '@src/utils/ai'
import { speakText, stopSpeaking } from '@src/utils/speak'
import {
  findLearningItem,
  removeLearningItem,
  saveLearningItem
} from '@renderer/services/learning-service'
import type { OverlayMode } from './style'
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

// 每种原图显示模式的下一模式
const NEXT_OVERLAY_MODE: Record<OverlayMode, OverlayMode> = {
  'show-original': 'hide-original',
  'hide-original': 'show-original'
}

// 每种原图显示模式的切换按钮文案
const OVERLAY_MODE_BUTTON_LABELS: Record<OverlayMode, string> = {
  'show-original': '隐藏原图',
  'hide-original': '显示原图'
}

/**
 * 渲染原始截图翻译结果浮层
 * @returns {React.JSX.Element} 翻译结果浮层
 */
export default function ResultOverlay(): React.JSX.Element {
  const [blocksToRender, setBlocksToRender] = useState<TextBlock[]>([])
  const [overlayMode, setOverlayMode] = useState<OverlayMode>('show-original')
  const originalText = useRef('')
  const translatedText = useRef('')
  const [bookmarkedItemId, setBookmarkedItemId] = useState<string | null>(null)
  const [isBookmarkSaving, setIsBookmarkSaving] = useState(false)
  const [hasBookmarkError, setHasBookmarkError] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const activeBookmarkRequestId = useRef(0)

  /** 创建当前截图收藏参数 */
  function createScreenshotLearningInput(): SaveLearningItemInput {
    return {
      kind: getTextType(originalText.current) === TextType.WORD ? 'word' : 'sentence',
      source: 'screenshot',
      originalText: originalText.current,
      translatedText: translatedText.current
    }
  }

  /** 复制指定文本并通知主进程 */
  function handleCopyText(text: string): void {
    navigator.clipboard.writeText(text)
    window.electron.ipcRenderer.send(SendEnum.COPY_TEXT_SUCCESS)
  }

  /** 复制原文 */
  function copyOriginalText(): void {
    handleCopyText(originalText.current)
  }

  /** 复制译文 */
  function copyTranslatedText(): void {
    handleCopyText(translatedText.current)
  }

  /** 切换原图显示状态 */
  function toggleOverlayMode(): void {
    setOverlayMode((mode) => NEXT_OVERLAY_MODE[mode])
  }

  /** 关闭当前翻译结果浮层 */
  function closeOverlayWindow(): void {
    stopSpeaking()
    window.electron.ipcRenderer.send(SendEnum.RESULT_WINDOW_CLOSE)
  }

  /** 朗读或停止朗读截图原文 */
  function toggleSpeakOriginal(): void {
    if (isSpeaking) {
      stopSpeaking()
      setIsSpeaking(false)
      return
    }
    const textToSpeak = originalText.current.trim()
    if (!textToSpeak) {
      return
    }
    setIsSpeaking(true)
    void speakText(
      textToSpeak,
      () => setIsSpeaking(false),
      () => setIsSpeaking(false)
    )
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
        const result = arg.result
        setBlocksToRender([])

        if (result?.success && result.textBlocks?.length > 0) {
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
      stopSpeaking()
      window.electron.ipcRenderer.removeAllListeners(SendEnum.DISPLAY_TRANSLATION_RESULT)
    }
  }, [])

  /** 截图翻译结果变化后同步收藏状态 */
  useEffect(() => {
    activeBookmarkRequestId.current += 1
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
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        closeOverlayWindow()
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
          $overlayMode={overlayMode}
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
          {OVERLAY_MODE_BUTTON_LABELS[overlayMode]}
        </CopyButton>
        <CopyButton aria-pressed={isSpeaking} onClick={toggleSpeakOriginal} type="button">
          {isSpeaking ? '停止朗读' : '朗读'}
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
              ? '重试收藏'
              : bookmarkedItemId
                ? '已收藏'
                : '收藏'}
        </CopyButton>
        <CopyButton onClick={closeOverlayWindow} title="关闭浮层 (Esc)" type="button">
          关闭
        </CopyButton>
      </FooterContainer>
    </OverlayContainer>
  )
}
