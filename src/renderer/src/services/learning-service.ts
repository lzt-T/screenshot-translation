import { SendEnum } from '@src/type/ipc-constants'
import type {
  LearningItem,
  LearningItemIdentity,
  LearningItemListData,
  LearningItemQuery,
  LearningResponse,
  SaveLearningItemInput
} from '@src/type/learning'

/**
 * 调用学习收藏 IPC
 * @param channel IPC 通道
 * @param payload 请求参数
 * @returns 学习收藏响应数据
 */
async function invokeLearningApi<TData>(channel: SendEnum, payload: unknown): Promise<TData> {
  // 主进程统一响应
  const response = (await window.electron.ipcRenderer.invoke(
    channel,
    payload
  )) as LearningResponse<TData>
  if (!response.success) {
    throw new Error(response.message)
  }
  return response.data
}

/** 查询学习收藏 */
export function listLearningItems(query: LearningItemQuery): Promise<LearningItemListData> {
  return invokeLearningApi(SendEnum.LEARNING_ITEM_LIST, query)
}

/** 保存学习收藏 */
export function saveLearningItem(input: SaveLearningItemInput): Promise<LearningItem> {
  return invokeLearningApi(SendEnum.LEARNING_ITEM_SAVE, input)
}

/** 取消学习收藏 */
export function removeLearningItem(itemId: string): Promise<boolean> {
  return invokeLearningApi(SendEnum.LEARNING_ITEM_REMOVE, itemId)
}

/** 查找学习收藏 */
export function findLearningItem(identity: LearningItemIdentity): Promise<LearningItem | null> {
  return invokeLearningApi(SendEnum.LEARNING_ITEM_FIND, identity)
}
