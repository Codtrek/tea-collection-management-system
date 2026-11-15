import { useEffect, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { Tabs } from '@/components/ui/Tabs'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { AdminGuard } from './AdminGuard'
import { ExpenseCategoriesCard } from './ExpenseCategoriesCard'
import { GeneralInfoTab, type ProfileDraft } from './GeneralInfoTab'
import { GradeRatesTab, type GradeDraft } from './GradeRatesTab'
import { TransportRatesTab, type TransportDraft } from './TransportRatesTab'
import { ItemPricesTab, type PriceDraft } from './ItemPricesTab'
import type { DraftTab } from './factory-setup-model'

/*
  ADM-01 Factory Setup — the business data other modules calculate with (Administration-Addendum).
  Each tab saves or publishes on its own; there is no page-level save. A tab's unsaved draft lives
  here, so switching tabs or leaving the page with unsaved changes asks first.
*/

const ITEM_TYPES = [
  { name: 'Rice', unit: 'kg' },
  { name: 'Dhal', unit: 'kg' },
  { name: 'Flour', unit: 'kg' },
]

const TABS = [
  { id: 'general', label: 'General Info' },
  { id: 'grades', label: 'Grade Rates' },
  { id: 'transport', label: 'Transport Rates' },
  { id: 'prices', label: 'Item Prices' },
  { id: 'items', label: 'Beneficiary Item Types' },
  { id: 'expenses', label: 'Expense Categories' },
]

interface Drafts {
  general: ProfileDraft | null
  grades: GradeDraft | null
  transport: TransportDraft | null
  prices: PriceDraft | null
}
const NO_DRAFTS: Drafts = { general: null, grades: null, transport: null, prices: null }
const isDraftTab = (t: string): t is DraftTab => t === 'general' || t === 'grades' || t === 'transport' || t === 'prices'

export function FactorySetupPage() {
  const { toast } = useToast()
  const [tab, setTab] = useState('general')
  const [drafts, setDrafts] = useState<Drafts>(NO_DRAFTS)
  const [leavingTo, setLeavingTo] = useState<string | null>(null)
  const dirty = Object.values(drafts).some(Boolean)

  // leaving the page (another route) with unsaved changes asks first; so does closing the tab
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const setDraft =
    <K extends keyof Drafts>(k: K) =>
    (d: Drafts[K]) =>
      setDrafts((prev) => ({ ...prev, [k]: d }))
  const changeTab = (next: string) => {
    if (next === tab) return
    if (isDraftTab(tab) && drafts[tab]) setLeavingTo(next)
    else setTab(next)
  }
  const tabLabel = (id: string) => TABS.find((t) => t.id === id)?.label ?? id

  return (
    <AdminGuard>
      <PageHeader
        title="Factory Setup"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Administration' }, { label: 'Factory Setup' }]}
        description="The factory's details and the rates, prices and categories other modules calculate with. Each tab saves on its own."
      />

      <Tabs
        tabs={TABS.map((t) => ({ ...t, label: isDraftTab(t.id) && drafts[t.id] ? `${t.label} •` : t.label }))}
        active={tab}
        onChange={changeTab}
        className="mb-5"
      />

      {tab === 'general' && <GeneralInfoTab draft={drafts.general} onDraft={setDraft('general')} />}
      {tab === 'grades' && <GradeRatesTab draft={drafts.grades} onDraft={setDraft('grades')} />}
      {tab === 'transport' && <TransportRatesTab draft={drafts.transport} onDraft={setDraft('transport')} />}
      {tab === 'prices' && <ItemPricesTab draft={drafts.prices} onDraft={setDraft('prices')} />}

      {tab === 'items' && (
        <Card className="max-w-2xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-heading">Beneficiary item types</h3>
            <Button size="sm" variant="secondary" onClick={() => toast('Item type added (demo)')}>
              <Plus className="size-4" /> Add Item Type
            </Button>
          </div>
          <ul className="divide-y divide-border rounded-[var(--radius-md)] border border-border">
            {ITEM_TYPES.map((t) => (
              <li key={t.name} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-medium text-text">{t.name}</span>
                <span className="text-xs text-text-muted">Unit: {t.unit}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-text-muted">
            Feeds the beneficiary-item workflow if that scope folds into Fertilizer Inventory later.
          </p>
        </Card>
      )}

      {tab === 'expenses' && (
        <div className="max-w-2xl">
          <ExpenseCategoriesCard />
        </div>
      )}

      <LightConfirmModal
        open={leavingTo !== null}
        onClose={() => setLeavingTo(null)}
        onConfirm={() => {
          if (isDraftTab(tab)) setDraft(tab)(null)
          setTab(leavingTo!)
          setLeavingTo(null)
        }}
        title="Discard unsaved changes?"
        confirmLabel="Discard and switch"
        cancelLabel="Stay"
        message={`${tabLabel(tab)} has changes that aren’t saved. Switching to ${tabLabel(leavingTo ?? '')} discards them.`}
      />
      <LightConfirmModal
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
        title="Leave Factory Setup?"
        confirmLabel="Leave without saving"
        cancelLabel="Stay"
        message="Some tabs have changes that aren’t saved. Leaving the page discards them."
      />
    </AdminGuard>
  )
}
