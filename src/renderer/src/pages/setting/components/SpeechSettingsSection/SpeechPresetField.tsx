import { useState } from 'react'
import { Copy, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@renderer/components/ui/select'

/** 预置选择与自定义输入共用字段 */
interface SpeechPresetFieldProps {
  id: string
  label: string
  value: string
  options?: readonly string[]
  isSecret?: boolean
  isInvalid: boolean
  describedBy: string
  onChange: (value: string) => void
}

/**
 * 渲染语音配置字段（支持预置切换、自定义输入与密钥显隐/复制）
 * @param props 字段属性
 * @returns 表单字段节点
 */
export function SpeechPresetField({
  id,
  label,
  value,
  options,
  isSecret,
  isInvalid,
  describedBy,
  onChange
}: SpeechPresetFieldProps): React.JSX.Element {
  // 用户是否展开自定义输入
  const [isCustomSelected, setIsCustomSelected] = useState(false)
  // 密钥明文可见性
  const [isSecretVisible, setIsSecretVisible] = useState(false)
  // 不在预置目录中的旧值自动显示为自定义
  const isCustom = isCustomSelected || !options?.includes(value)
  // 使用选项索引作为控件值，避免自定义标记与实际模型或音色 ID 冲突
  const selectedOption = isCustom ? 'custom' : String(options?.indexOf(value))

  /** 选择自定义只展开输入，选择预置才保存实际值 */
  function selectOption(option: string): void {
    setIsCustomSelected(option === 'custom')
    if (option !== 'custom' && options) {
      onChange(options[Number(option)])
    }
  }

  /** 复制密钥文本 */
  function handleCopySecret(): void {
    if (!value) {
      return
    }
    void navigator.clipboard.writeText(value).then(() => {
      toast.success(`已复制 ${label}`)
    })
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {options ? (
        <>
          <Select value={selectedOption} onValueChange={selectOption}>
            <SelectTrigger id={id} className="w-full" aria-invalid={isInvalid} aria-describedby={describedBy}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((option, index) => (
                <SelectItem key={option} value={String(index)}>
                  {option}
                </SelectItem>
              ))}
              <SelectItem value="custom">自定义…</SelectItem>
            </SelectContent>
          </Select>
          {isCustom && (
            <Input
              id={`${id}-custom`}
              aria-label={`自定义${label}`}
              value={value}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={isInvalid}
              aria-describedby={describedBy}
              onChange={(event) => onChange(event.target.value)}
            />
          )}
        </>
      ) : isSecret ? (
        <div className="flex items-center gap-2">
          <Input
            id={id}
            className="min-w-0 flex-1"
            value={value}
            type={isSecretVisible ? 'text' : 'password'}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={isInvalid}
            aria-describedby={describedBy}
            onChange={(event) => onChange(event.target.value)}
          />
          <Button
            aria-label={isSecretVisible ? `隐藏 ${label}` : `显示 ${label}`}
            className="cursor-pointer"
            onClick={() => setIsSecretVisible((prev) => !prev)}
            size="icon"
            title={isSecretVisible ? `隐藏 ${label}` : `显示 ${label}`}
            type="button"
            variant="outline"
          >
            {isSecretVisible ? <EyeOff size={14} /> : <Eye size={14} />}
          </Button>
          <Button
            aria-label={`复制 ${label}`}
            className="cursor-pointer"
            disabled={!value}
            onClick={handleCopySecret}
            size="icon"
            title={`复制 ${label}`}
            type="button"
            variant="outline"
          >
            <Copy size={14} />
          </Button>
        </div>
      ) : (
        <Input
          id={id}
          value={value}
          type="text"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={isInvalid}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  )
}
