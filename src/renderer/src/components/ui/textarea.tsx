import * as React from "react"

import { cn } from "@renderer/lib/utils"

/** 渲染带统一状态反馈的多行输入框 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-card px-3 py-2 text-base outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/45 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/25 disabled:cursor-not-allowed disabled:opacity-45 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
