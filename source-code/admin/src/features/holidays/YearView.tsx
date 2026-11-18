import type { HolidayYear } from '@/features/employees/types'
import { periodOf } from '@/lib/month'
import { cn } from '@/lib/cn'
import { chipsFor, monthMatrix, shadeFor, weekdayHeader, type Category } from './calendar-model'
import { CHIP_STYLE } from './holiday-style'

interface YearViewProps {
  data: HolidayYear
  today: string
  show: Category
  onOpenMonth: (month: string) => void
  onOpenDay: (date: string) => void
}

/** Twelve mini-months with a dot per holiday; a month's name opens it in the month view. */
export function YearView({ data, today, show, onOpenMonth, onOpenDay }: YearViewProps) {
  const months = Array.from({ length: 12 }, (_, i) => `${data.year}-${String(i + 1).padStart(2, '0')}`)
  const header = weekdayHeader(data.weekStartsOn)
  return (
    <div className="grid gap-x-6 gap-y-5 p-4 sm:grid-cols-2 xl:grid-cols-3">
      {months.map((m) => (
        <section key={m} aria-label={periodOf(m)}>
          <button type="button" onClick={() => onOpenMonth(m)} className="mb-1.5 text-sm font-semibold text-text-heading hover:text-primary hover:underline">
            {periodOf(m).split(' ')[0]}
          </button>
          <div className="grid grid-cols-7 text-center text-[10px] text-text-muted">
            {header.map((d) => (
              <span key={d}>{d.slice(0, 2)}</span>
            ))}
            {monthMatrix(m, data.weekStartsOn)
              .flat()
              .map(({ date, inMonth }) => {
                if (!inMonth) return <span key={date} />
                const chips = chipsFor(date, data.holidays, data.pending)
                const shade = shadeFor(date, show, data.weeklyRules, data.holidays)
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => onOpenDay(date)}
                    title={chips.map((c) => `${CHIP_STYLE[c.kind].label}: ${c.label}`).join('\n') || undefined}
                    className={cn(
                      'flex h-7 flex-col items-center justify-center rounded-[var(--radius-xs)] text-[11px] tabular text-text hover:bg-brand-soft',
                      shade && 'bg-surface-hover',
                      date < today && 'text-text-muted',
                      date === today && 'outline outline-2 -outline-offset-2 outline-primary',
                    )}
                  >
                    {Number(date.slice(8))}
                    <span className="flex h-1.5 gap-0.5">
                      {chips.slice(0, 3).map((c) => (
                        <span key={c.key} className={cn('size-1.5 rounded-full', CHIP_STYLE[c.kind].dot)} />
                      ))}
                    </span>
                  </button>
                )
              })}
          </div>
        </section>
      ))}
    </div>
  )
}
