import { ipcMain } from 'electron'
import { SendEnum } from '../../type/ipc-constants'
import type { ConversationRequest } from '../../type/conversation'
import { getErrorMessage } from '../utils/error'
import { aiManage } from '../utils/aiManage'

/** 注册口语对话 IPC 事件 */
export function registerConversationIpcEvents(): void {
  ipcMain.handle(SendEnum.CONVERSATION_REPLY, async (_event, request: ConversationRequest) => {
    try {
      // 结构化口语教练结果
      const result = await aiManage.createConversationReply(request)
      if (!result.success || !result.data) {
        throw new Error(result.msg || '口语教练回复生成失败')
      }
      return result.data
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  })
}
