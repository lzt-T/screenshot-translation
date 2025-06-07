import { toast } from "sonner"

export const copyText = (text: string, onSuccess?: () => void, onError?: () => void) => {
  if (!text) {
    return
  }

  navigator.clipboard.writeText(text)
    .then(() => {
      toast.success('复制成功', { id: 'copy-success' })
      onSuccess && onSuccess()
    })
    .catch(() => {
      toast.error('复制失败', { id: 'copy-fail' })
      onError && onError()
    })
}