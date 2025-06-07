import React, { useEffect, useRef, useState } from 'react';
import { SendEnum } from '@src/type/ipc-constants';
import { Button } from '@renderer/components/ui/button'
import { Textarea } from '@renderer/components/ui/textarea'
import _ from 'lodash'
import { toast } from 'sonner'
import { Copy, ArrowRight, Loader2, Languages, Camera } from 'lucide-react'
import '../../scroll.css' // 导入自定义滚动条样式

export default function Index() {
  const [isLoading, setIsLoading] = useState(false)
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

  /** 复制翻译结果 */
  const copyTranslationResult = () => {
    if (!translationResult) {
      toast.error('没有可复制的内容', { id: 'copy-empty' })
      return
    }
    
    navigator.clipboard.writeText(translationResult)
      .then(() => {
        toast.success('复制成功', { id: 'copy-success' })
      })
      .catch(() => {
        toast.error('复制失败', { id: 'copy-fail' })
      })
  }

  useEffect(() => {
    // 移除可能存在的旧监听器
    window.electron.ipcRenderer.removeAllListeners(SendEnum.ENGLISH_CHINESE_TRANSLATION_SUCCESS);
    window.electron.ipcRenderer.removeAllListeners(SendEnum.ENGLISH_CHINESE_TRANSLATION_FAIL);
    
    // 成功处理函数
    const handleSuccess = (event, result) => {
      setIsLoading(false)
      setTranslationResult(result)
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
      <div className="flex w-full gap-2 flex-1 items-center h-auto mt-1">
        {/* 左侧输入区域 */}
        <div className="flex-1">
          <Textarea 
            className="h-full min-h-[400px] max-h-[400px] resize-none overflow-auto custom-scrollbar" 
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
          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary">
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ArrowRight size={16} />
            )}
          </div>
        </div>
        
        {/* 右侧结果区域 */}
        <div className="flex-1 relative">
          <Textarea 
            className="h-full min-h-[400px] max-h-[400px] resize-none overflow-auto pr-8 text-lg font-medium text-primary leading-relaxed custom-scrollbar" 
            value={translationResult}
            readOnly
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(0, 0, 0, 0.2) transparent'
            }}
          />
          {translationResult && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-2 right-2 opacity-80 hover:opacity-100 z-10 cursor-pointer" 
              onClick={copyTranslationResult}
              title="复制翻译结果"
            >
              <Copy size={16} />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}