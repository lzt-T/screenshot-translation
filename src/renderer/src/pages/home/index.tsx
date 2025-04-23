import React, { useEffect } from 'react';
import { SendEnum } from '@src/type/ipc-constants';
import { Description, HintText, PageContainer, Title } from './style';
import TechButton from '@renderer/components/Button'

export default function Index() {
  const onScreenshot = () => {
    window.electron.ipcRenderer.send(SendEnum.SCREENSHOT_START)
  }

  return (
    <PageContainer>
      <Title>欢迎使用截图翻译</Title>
      <Description>
        快速捕捉屏幕区域并进行翻译。
      </Description>
      <TechButton type="primary" onClick={onScreenshot}>开始截图</TechButton>
      <HintText style={{ marginTop: 10 }}>或者直接按 F2 快捷键</HintText>
    </PageContainer>
  )
}