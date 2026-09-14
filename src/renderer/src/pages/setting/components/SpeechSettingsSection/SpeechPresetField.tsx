import { useState } from 'react'
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

/** 保留原始配置值，仅在本地管理用户主动展开的自定义输入 */
export function SpeechPresetField({ id, label, value, options, isSecret, isInvalid, describedBy, onChange }: SpeechPresetFieldProps) {
  // 用户可以展开自定义输入而不清空当前已保存值
  const [isCustomSelected, setIsCustomSelected] = useState(false)
  // 不在预置目录中的旧值自动显示为自定义
  const isCustom = isCustomSelected || !options?.includes(value)
  // 使用选项索引作为控件值，避免自定义标记与实际模型或音色 ID 冲突
  const selectedOption = isCustom ? 'custom' : String(options?.indexOf(value))

  /** 选择自定义只展开输入，选择预置才保存实际值 */
  function selectOption(option: string): void {
    setIsCustomSelected(option === 'custom')
    if (option !== 'custom' && options) onChange(options[Number(option)])
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
              {options.map((option, index) => <SelectItem key={option} value={String(index)}>{option}</SelectItem>)}
              <SelectItem value="custom">自定义…</SelectItem>
            </SelectContent>
          </Select>
          {isCustom && (
            <Input id={`${id}-custom`} aria-label={`自定义${label}`} value={value} autoComplete="off" spellCheck={false}
              aria-invalid={isInvalid} aria-describedby={describedBy} onChange={(event) => onChange(event.target.value)} />
          )}
        </>
      ) : (
        <Input id={id} value={value} type={isSecret ? 'password' : 'text'} autoComplete="off" spellCheck={false}
          aria-invalid={isInvalid} aria-describedby={describedBy} onChange={(event) => onChange(event.target.value)} />
      )}
    </div>
  )
}
