import { useState, useEffect, useCallback } from 'react'
import { OverlayContainer, TranslatedTextOverlay } from './style'
import { SendEnum } from '@src/type/ipc-constants'

interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

interface TextBlock {
  text: string // 原文在某些情况下可能丢失
  translation: string
  boundingBox: BoundingBox
}

interface ResultData {
  success: boolean
  textBlocks: TextBlock[]
  msg?: string
}

const ResultOverlay = () => {
  const [blocksToRender, setBlocksToRender] = useState<TextBlock[]>([])

  useEffect(() => {
    window.electron.ipcRenderer.on(
      SendEnum.DISPLAY_TRANSLATION_RESULT,
      (event, arg: { result: ResultData }) => {
        const result = arg.result
        setBlocksToRender([])

        // 仅在成功且有文本块时处理
        if (result && result.success && result.textBlocks && result.textBlocks.length > 0) {
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
        } else {
          console.log('[ResultOverlay] 收到不成功的结果或无文本块。错误弹窗应处理显示。')
        }
      }
    )

    return () => {
      window.electron.ipcRenderer.removeAllListeners(SendEnum.DISPLAY_TRANSLATION_RESULT)
    }
  }, [])

  // 关闭窗口的处理程序 (用于 Esc)
  const handleClose = useCallback(() => {
    window.electron.ipcRenderer.send(SendEnum.RESULT_WINDOW_CLOSE)
  }, [])

  // 处理 Escape 键
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    },
    [handleClose]
  )

  // 添加/移除键盘事件监听器
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  return (
    <OverlayContainer>
      {blocksToRender.map((block, index) =>
        block.boundingBox ? (
          <TranslatedTextOverlay
            key={index}
            style={{
              left: `${block.boundingBox.x}px`,
              top: `${block.boundingBox.y}px`,
              width: `${block.boundingBox.width}px`
            }}
          >
            {block.translation}
          </TranslatedTextOverlay>
        ) : null
      )}
    </OverlayContainer>
  )
}

export default ResultOverlay
