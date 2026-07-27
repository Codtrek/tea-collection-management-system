import { useState, type ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import { Tabs, type TabItem } from '@/components/ui/Tabs'

export interface DetailTab extends TabItem {
  content: ReactNode
}

export interface DetailPageWithTabsProps {
  /** profile header block (avatar, name, badges) */
  header: ReactNode
  tabs: DetailTab[]
  defaultTab?: string
}

/* Profile header + tabbed sections (master EMP-03). Reused by EST-03. */
export function DetailPageWithTabs({ header, tabs, defaultTab }: DetailPageWithTabsProps) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id)
  const activeTab = tabs.find((t) => t.id === active) ?? tabs[0]

  return (
    <div className="flex flex-col gap-4">
      <Card>{header}</Card>
      <div>
        <Tabs tabs={tabs} active={active} onChange={setActive} className="mb-4" />
        <div>{activeTab?.content}</div>
      </div>
    </div>
  )
}
