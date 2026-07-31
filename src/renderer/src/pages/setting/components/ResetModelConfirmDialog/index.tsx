import React from 'react'
import { Button } from '@renderer/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'

/** 重置模型确认弹窗属性 */
interface ResetModelConfirmDialogProps {
  /* 弹窗是否打开 */
  open: boolean
  /* 将被删除的自定义模型数量 */
  customModelCount: number
  /* 是否正在重置 */
  isResetting: boolean
  /* 取消回调 */
  onCancel: () => void
  /* 确认回调 */
  onConfirm: () => void
}

/**
 * 渲染重置模型配置确认弹窗
 * @param props 弹窗属性
 * @returns 弹窗节点
 */
const ResetModelConfirmDialog: React.FC<ResetModelConfirmDialogProps> = ({
  open,
  customModelCount,
  isResetting,
  onCancel,
  onConfirm
}) => {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !isResetting && onCancel()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>确认重置模型配置</DialogTitle>
          <DialogDescription>
            将删除 {customModelCount}{' '}
            个自定义模型及其连接凭据，并恢复使用内置免费模型。此操作无法撤销。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button disabled={isResetting} onClick={onCancel} type="button" variant="outline">
            取消
          </Button>
          <Button disabled={isResetting} onClick={onConfirm} type="button" variant="destructive">
            {isResetting ? '正在重置…' : '重置配置'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ResetModelConfirmDialog
