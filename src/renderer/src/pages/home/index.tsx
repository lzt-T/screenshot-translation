import React, { useEffect, useRef, useState } from 'react';
import { SendEnum } from '@src/type/ipc-constants';
import { Button } from '@renderer/components/ui/button'
import { Textarea } from '@renderer/components/ui/textarea'
import _ from 'lodash'
import { toast } from 'sonner'
import { Copy, ArrowRight, Loader2, Languages, Camera, Volume2, VolumeX } from 'lucide-react'
import '../../scroll.css' // 导入自定义滚动条样式
import { speakText } from '@src/utils/speak';
import { copyText } from '@src/utils/copy';

export default function Index() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  /** 翻译文本 */
  const translationText = useRef('')
  /** 上一次翻译文本 */
  const lastTranslationText = useRef('')
  /** 翻译是否成功 */
  const translateSuccess = useRef(false)
  /** 翻译结果 */
  const [translationResult, setTranslationResult] = useState('')

  /** 处理输入文本变化 */
  const handleInputTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    translationText.current = e.target.value

    if (e.target.value.trim() === '') {
      setTranslationResult('')
      translateSuccess.current = false
    }
  }

  /** 处理键盘事件 */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onEnglishChineseTranslation()
    }
  }

  /** 开始截图 */
  const onScreenshot = () => {
    window.electron.ipcRenderer.send(SendEnum.SCREENSHOT_START)
  }

  /** 英汉互译 */
  const onEnglishChineseTranslation = () => {
    if (isLoading) {
      toast.error('正在翻译中...')
      return
    }
    if (translationText.current.trim() === '') {
      toast.error('请输入要翻译的文本')
      return
    }

    if (translateSuccess.current && lastTranslationText.current === translationText.current) {
      toast.error('已翻译')
      return
    }

    lastTranslationText.current = translationText.current
    setIsLoading(true)
    window.electron.ipcRenderer.send(SendEnum.ENGLISH_CHINESE_TRANSLATION, translationText.current)
  }

  /** 朗读输入文本 */
  const speakInputText = () => {
    if (!translationText.current || isSpeaking) {
      return
    }
    setIsSpeaking(true)
    speakText(translationText.current, () => {
      setIsSpeaking(false)
    }, () => {
      setIsSpeaking(false)
    })
  }

  /** 朗读翻译结果 */
  const speakTranslationResult = () => {
    if (!translationResult || isSpeaking) {
      return
    }
    setIsSpeaking(true)
    speakText(translationResult, () => {
      setIsSpeaking(false)
    }, () => {
      setIsSpeaking(false)
    })
  }
  
  useEffect(() => {
    // 移除可能存在的旧监听器
    window.electron.ipcRenderer.removeAllListeners(SendEnum.ENGLISH_CHINESE_TRANSLATION_SUCCESS);
    window.electron.ipcRenderer.removeAllListeners(SendEnum.ENGLISH_CHINESE_TRANSLATION_FAIL);
    
    // 成功处理函数
    const handleSuccess = (event, result) => {
      setIsLoading(false)
      setTranslationResult(()=>{
        //去除头尾的"
        return result.replace(/"/g, '')
      })
      translateSuccess.current = true
      toast.success('翻译成功', {
        id: 'translation-success'
      })
    }
    
    // 失败处理函数
    const handleFail = (event, result) => {
      setIsLoading(false)
      toast.error(result, {
        id: 'translation-fail'
      })
      translateSuccess.current = false
    }
    
    // 注册监听器
    window.electron.ipcRenderer.on(SendEnum.ENGLISH_CHINESE_TRANSLATION_SUCCESS, handleSuccess)
    window.electron.ipcRenderer.on(SendEnum.ENGLISH_CHINESE_TRANSLATION_FAIL, handleFail)
    
    // 清理函数，组件卸载时移除监听器
    return () => {
      window.electron.ipcRenderer.removeListener(SendEnum.ENGLISH_CHINESE_TRANSLATION_SUCCESS, handleSuccess)
      window.electron.ipcRenderer.removeListener(SendEnum.ENGLISH_CHINESE_TRANSLATION_FAIL, handleFail)
      // 确保离开页面时停止所有语音
      window.speechSynthesis.cancel()
    }
  }, [])

  return (
    // Replace PageContainer with div and Tailwind classes
    <div className="flex flex-col items-center h-full gap-4 p-6">
      {/* 顶部图标和功能区域 */}
      <div className="w-full max-w-3xl mb-4">
        <div className="flex flex-col items-center mb-3">
          <div className="flex items-center justify-center mb-3 text-primary">
            <Languages size={32} className="mr-2" />
            <Camera size={28} />
          </div>
          <p className="text-sm text-muted-foreground">截取屏幕内容，即时翻译</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button 
            className="w-full sm:w-auto cursor-pointer bg-primary hover:bg-primary/90 text-white shadow-sm transition-all" 
            size="lg" 
            onClick={onScreenshot}
          >
            开始截图
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2 sm:mt-0">
            <span>或按</span>
            <kbd className="px-2 py-1 bg-muted rounded border border-border shadow-sm text-xs font-mono">F2</kbd>
            <span>快捷键</span>
          </div>
        </div>
      </div>
      
      {/* 左右结构布局 */}
      <div className="flex w-full gap-2 flex-1 items-center h-auto">
        {/* 左侧输入区域 */}
        <div className="flex-1">
          <div className="flex justify-between items-center p-2 bg-muted/30 border border-b-0 rounded-t-md">
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
                title={isSpeaking ? "停止朗读" : "朗读输入文本"}
              >
                {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </Button>
            </div>
          </div>
          <Textarea 
            className="h-full min-h-[360px] max-h-[360px] resize-none overflow-auto custom-scrollbar rounded-t-none" 
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
        <div className="flex items-center justify-center w-10">
          <div 
            className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary cursor-pointer hover:bg-primary/20 transition-colors"
            title={isLoading ? "正在翻译" : "点击翻译"}
            onClick={!isLoading ? onEnglishChineseTranslation : undefined}
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ArrowRight size={16} />
            )}
          </div>
        </div>
        
        {/* 右侧结果区域 */}
        <div className="flex-1 relative">
          <div className="flex justify-between items-center p-2 bg-muted/30 border border-b-0 rounded-t-md">
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
                title={isSpeaking ? "停止朗读" : "朗读翻译结果"}
              >
                {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </Button>
            </div>
          </div>
          <Textarea 
            className="h-full min-h-[360px] max-h-[360px] resize-none overflow-auto text-lg font-medium text-primary leading-relaxed custom-scrollbar rounded-t-none" 
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