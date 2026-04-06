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

/** 删除模型确认弹窗属性 */
interface DeleteModelConfirmDialogProps {
  /* 弹窗是否打开 */
  open: boolean
  /* 模型名称 */
  modelName?: string
  /* 取消回调 */
  onCancel: () => void
  /* 确认删除回调 */
  onConfirm: () => void
}

/**
 * 删除模型确认弹窗
 * @param {DeleteModelConfirmDialogProps} props 组件属性
 * @returns {React.JSX.Element} 弹窗节点
 */
const DeleteModelConfirmDialog: React.FC<DeleteModelConfirmDialogProps> = ({
  open,
  modelName,
  onCancel,
  onConfirm
}) => {
  // 展示用模型名
  const modelNameText = modelName || '该模型'

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>确认删除模型</DialogTitle>
          <DialogDescription>你确定要删除“{modelNameText}”吗？删除后无法恢复。</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onCancel} type="button" variant="outline">
            取消
          </Button>
          <Button onClick={onConfirm} type="button" variant="destructive">
            删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DeleteModelConfirmDialog
