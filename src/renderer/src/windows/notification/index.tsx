import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ErrorContainer, ErrorMessage } from './style'
import { SendEnum } from '@src/type/ipc-constants'
import { NoticeType } from '@src/type/notice'

const ErrorNotification: React.FC = () => {
  const [errorMessage, setErrorMessage] = useState<string>('发生未知错误')
  const [noticeType, setNoticeType] = useState<NoticeType>(NoticeType.INFO)

  useEffect(() => {
    window.electron.ipcRenderer.on(SendEnum.DISPLAY_NOTIFICATION, (event, data) => {
      setErrorMessage(data.message || '发生未知错误') 
      setNoticeType(data.type)
    })

    setTimeout(() => {
      window.electron.ipcRenderer.send(SendEnum.CLOSE_NOTIFICATION)
    }, 7000)

    return () => {
      window.electron.ipcRenderer.removeAllListeners(SendEnum.DISPLAY_NOTIFICATION)
    }
  }, [])

  return (
    <ErrorContainer noticeType={noticeType}>
      <ErrorMessage>{errorMessage}</ErrorMessage>
    </ErrorContainer>
  )
}

export default ErrorNotification
