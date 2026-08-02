import { ipcMain } from 'electron'
import { SendEnum } from '../../type/ipc-constants'
import type {
  LearningItem,
  LearningItemIdentity,
  LearningItemListData,
  LearningItemQuery,
  LearningResponse,
  SaveLearningItemInput
} from '../../type/learning'
import { getErrorMessage } from '../utils/error'
import { learningRepository } from '../learning/learning-repository'

/**
 * 执行学习收藏操作并转换统一响应
 * @param operation 收藏操作
 * @returns 统一收藏响应
 */
function executeLearningOperation<TData>(operation: () => TData): LearningResponse<TData> {
  try {
    return { success: true, data: operation() }
  } catch (error) {
    return { success: false, message: getErrorMessage(error) }
  }
}

/** 注册学习收藏 IPC 事件 */
export function registerLearningIpcEvents(): void {
  ipcMain.handle(
    SendEnum.LEARNING_ITEM_LIST,
    (_event, query: LearningItemQuery): LearningResponse<LearningItemListData> =>
      executeLearningOperation(() => learningRepository.list(query || {}))
  )
  ipcMain.handle(
    SendEnum.LEARNING_ITEM_SAVE,
    (_event, input: SaveLearningItemInput): LearningResponse<LearningItem> =>
      executeLearningOperation(() => learningRepository.save(input))
  )
  ipcMain.handle(
    SendEnum.LEARNING_ITEM_REMOVE,
    (_event, itemId: string): LearningResponse<boolean> =>
      executeLearningOperation(() => learningRepository.remove(itemId))
  )
  ipcMain.handle(
    SendEnum.LEARNING_ITEM_FIND,
    (_event, identity: LearningItemIdentity): LearningResponse<LearningItem | null> =>
      executeLearningOperation(() => learningRepository.find(identity))
  )
}
