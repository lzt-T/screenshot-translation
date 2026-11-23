import React from 'react'
import { Volume2 } from 'lucide-react'

/** 朗读状态指示属性 */
interface SpeakingIndicatorProps {
  /** 当前是否正在朗读 */
  isSpeaking: boolean
  /** 静止时图标尺寸 */
  iconSize?: number
}

/**
 * 渲染静止扬声器图标或朗读中的三柱声波动画
 * @param props 指示器属性
 * @returns 朗读指示节点
 */
export default function SpeakingIndicator({
  isSpeaking,
  iconSize = 14
}: SpeakingIndicatorProps): React.JSX.Element {
  if (!isSpeaking) {
    return <Volume2 size={iconSize} />
  }

  return (
    <span aria-hidden="true" className="speaking-wave">
      <span />
      <span />
      <span />
    </span>
  )
}
