import React from 'react'

export default function Index() {
  return (
    // Replace PageContainer with div and Tailwind classes
    <div className="p-6">
      {/* Replace Title with h1 and Tailwind classes */}
      <h1 className="mb-4 text-2xl font-semibold text-foreground">
        版本信息
      </h1>
      {/* Style version paragraphs */}
      <div className="space-y-2">
        <p className="text-base text-muted-foreground">
          应用版本: <span className="text-foreground">v1.0.0 (占位符)</span>
        </p>
        <p className="text-base text-muted-foreground">
          Electron 版本: <span className="text-foreground">...</span>
        </p>
        <p className="text-base text-muted-foreground">
          Chromium 版本: <span className="text-foreground">...</span>
        </p>
        <p className="text-base text-muted-foreground">
          Node.js 版本: <span className="text-foreground">...</span>
        </p>
      </div>
    </div>
  )
}
