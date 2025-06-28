import React from 'react'
import { Button } from '@renderer/components/ui/button'
import { Textarea } from '@renderer/components/ui/textarea'
import { Copy, ArrowRight, Loader2, Volume2, VolumeX, ArrowLeftRight } from 'lucide-react'
import '../../scroll.css' // 导入自定义滚动条样式
import { copyText } from '@src/utils/copy'
import useData from './useData'
import Header from './Header'

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
    swapContent,
    speakInputText,
    speakTranslationResult
  } = useData()

  return (
    // Replace PageContainer with div and Tailwind classes
    <div className="flex flex-col items-center min-h-full gap-4 p-6">
      {/* 顶部图标和功能区域 */}
      <Header onScreenshot={onScreenshot} />

      {/* 左右结构布局 */}
      <div className="flex w-full gap-2 flex-1">
        {/* 左侧输入区域 */}
        <div className="flex-1 self-stretch">
          <div className="flex justify-between items-center p-2 bg-muted/30 border border-b-0 rounded-t-md h-[50px]">
            <div className="opacity-0">占位</div>
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
            className="h-[calc(100%-50px)] resize-none overflow-auto custom-scrollbar rounded-t-none"
            onChange={handleInputTextChange}
            onKeyDown={handleKeyDown}
            placeholder="输入中文或英文，按回车进行互译"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(0, 0, 0, 0.2) transparent'
            }}
          />
        </div>

        {/* 中间图标：加载中显示旋转加载图标，否则显示箭头 */}
        <div className="flex flex-col items-center justify-center w-15 gap-2">
          <div
            className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary cursor-pointer hover:bg-primary/20 transition-colors"
            title={isLoading ? '正在翻译' : '点击翻译'}
            onClick={!isLoading ? onEnglishChineseTranslation : undefined}
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          </div>
          
          {/* 交换按钮 */}
          <div className="flex flex-col items-center gap-1">
            <div
              className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary cursor-pointer hover:bg-primary/20 transition-colors"
              title="交换内容 (Ctrl+R)"
              onClick={swapContent}
            >
              <ArrowLeftRight size={16} />
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded border border-border shadow-sm text-[10px] font-mono">
                Ctrl
              </kbd>
              <span>+</span>
              <kbd className="px-1 py-0.5 bg-muted rounded border border-border shadow-sm text-[10px] font-mono">
                R
              </kbd>
            </div>
          </div>
        </div>

        {/* 右侧结果区域 */}
        <div className="flex-1 relative self-stretch">
          <div className="flex justify-between items-center p-2 bg-muted/30 border border-b-0 rounded-t-md h-[50px]">
            <div className="opacity-0">占位</div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 ${!translationResult ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={() => copyText(translationResult)}
                title="复制翻译结果"
              >
                <Copy size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 ${isSpeaking ? 'bg-muted' : ''} ${!translationResult ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={speakTranslationResult}
                title={isSpeaking ? '停止朗读' : '朗读翻译结果'}
              >
                {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </Button>
            </div>
          </div>
          <Textarea
            className="h-[calc(100%-50px)] resize-none overflow-auto text-lg font-medium text-primary leading-relaxed custom-scrollbar rounded-t-none"
            value={translationResult}
            readOnly
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(0, 0, 0, 0.2) transparent'
            }}
          />
        </div>
      </div>
    </div>
  )
}
