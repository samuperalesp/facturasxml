import type { ReactNode } from 'react'

interface ReportLayoutProps {
  sidebar: ReactNode
  children: ReactNode
}

export function ReportLayout({ sidebar, children }: ReportLayoutProps) {
  return (
    <div className="report-layout">
      {sidebar}
      <main className="report-content">
        {children}
      </main>
    </div>
  )
}
