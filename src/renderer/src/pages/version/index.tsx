import React from 'react'
import { PageContainer, Title } from './style'


export default function Index() {

  return (
    <PageContainer>
      <Title>版本信息</Title>
      <p>应用版本: v1.0.0 (占位符)</p>
      <p>Electron 版本: ...</p>
      <p>Chromium 版本: ...</p>
      <p>Node.js 版本: ...</p>
    </PageContainer>
  )
}
