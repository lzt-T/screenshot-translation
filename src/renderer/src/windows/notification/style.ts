import styled from 'styled-components'
import { NoticeType } from '../../../../type/notice'

const getBorderColor = (noticeType: NoticeType) => {
  const config = {
    [NoticeType.ERROR]: '#f56c6c',
    [NoticeType.INFO]: '#909399',
    [NoticeType.WARNING]: '#e6a23c',
    [NoticeType.SUCCESS]: '#67c23a'
  }
  return config[noticeType]
}

export const ErrorContainer = styled.div<{ noticeType: NoticeType }>`
  width: 100vw;
  height: 100vh;
  padding: 0px 15px; // 调整后的内边距
  background-color: rgba(40, 40, 40, 0.95); // 深色背景
  color: #f0f0f0; // 浅灰色文本
  font-size: 14px; // 稍小字体
  line-height: 1.4;
  border-radius: 4px; // 较小圆角
  border-left: 5px solid ${({ noticeType }) => getBorderColor(noticeType)};
  display: flex;
  justify-content: flex-start; // 内容左对齐
  align-items: center; // 垂直居中内容
  box-sizing: border-box;
`

export const ErrorMessage = styled.p`
  margin: 0;
  word-wrap: break-word; // 换行长消息
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
`
