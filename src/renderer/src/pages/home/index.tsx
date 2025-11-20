import React from 'react'
import { Button } from '@renderer/components/ui/button'
import { Textarea } from '@renderer/components/ui/textarea'
import { Copy, Loader2, Volume2, VolumeX } from 'lucide-react'
import '../../scroll.css' // 导入自定义滚动条样式
import { copyText } from '@src/utils/copy'
import useData from './useData'
import Header from './Header'
import ResultView from './ResultView'
import { cn } from '@renderer/lib/utils'

export default function Index() {
  const {
    isLoading,
    isSpeaking,
    translationText,
    translationResult,
    handleInputTextChange,
    handleKeyDown,
    onScreenshot,
    onEnglishChineseTranslation,
    speakInputText
  } = useData()

  return (
    // Replace PageContainer with div and Tailwind classes
    <div className="flex flex-col items-center min-h-full gap-4 p-6">
      {/* 顶部图标和功能区域 */}
      <Header onScreenshot={onScreenshot} />

      {/* 左右结构布局 */}
      <div className="flex flex-col w-full gap-2 flex-1">
        {/* 左侧输入区域 */}
        <div className="self-stretch">
          <div className="flex justify-between items-center p-2 bg-muted/30 border border-b-0 rounded-t-md h-[50px]">
            <div> {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}</div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 ${!translationText.current ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={() => copyText(translationText.current)}
                title="复制输入文本"
              >
                <Copy size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 ${isSpeaking ? 'bg-muted' : ''} ${!translationText.current ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={speakInputText}
                title={isSpeaking ? '停止朗读' : '朗读输入文本'}
              >
                {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </Button>
            </div>
          </div>
          <Textarea
            className={cn(
              'resize-none overflow-auto custom-scrollbar rounded-t-none min-h-[100px] max-h-[160px] '
            )}
            onChange={handleInputTextChange}
            onKeyDown={handleKeyDown}
            placeholder="输入中文或英文，按回车进行互译"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(0, 0, 0, 0.2) transparent'
            }}
          />
        </div>

        {/* 右侧结果区域 */}
        <div className="relative">
          <ResultView result={translationResult} />
        </div>
      </div>
    </div>
  )
}
