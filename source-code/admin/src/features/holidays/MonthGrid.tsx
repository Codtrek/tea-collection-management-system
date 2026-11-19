import type { Holiday, HolidayRequest, HolidayYear } from '@/features/employees/types'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/cn'
import { chipsFor, monthMatrix, shadeFor, visibleChips, weekdayHeader, weekdayOf, WEEKDAY_NAMES, type Category } from './calendar-model'
import { HolidayChip } from './HolidayChip'
import { SHADE_STYLE } from './holiday-style'

interface MonthGridProps {
  month: string
  today: string
  weekStartsOn: 0 | 1
  show: Category
  holidays: Holiday[]
  pending: HolidayRequest[]
  weeklyRules: HolidayYear['weeklyRules']
  onOpenDay: (date: string) => void
}

/*
  The month grid (Attendance-Leave-Addendum §4.4): 7 columns from the "week starts on" setting;
  each day its number, up to two holiday chips and "+N more"; the chosen category's weekly
  holidays / category holidays shaded; today outlined; past days muted. Below `md` it becomes
  an agenda list of the days that have something on them.
*/
export function MonthGrid(props: MonthGridProps) {
  return (
    <>
      <div className="hidden md:block">
        <Grid {...props} />
      </div>
      <div className="md:hidden">
        <Agenda {...props} />
      </div>
    </>
  )
}

function Grid({ month, today, weekStartsOn, show, holidays, pending, weeklyRules, onOpenDay }: MonthGridProps) {
  const weeks = monthMatrix(month, weekStartsOn)
  return (
    <div role="grid" aria-label="Holiday calendar month">
      <div role="row" className="grid grid-cols-7 border-b border-border">
        {weekdayHeader(weekStartsOn).map((d) => (
          <div key={d} role="columnheader" className="px-2 py-2 text-center text-[11px] font-medium uppercase tracking-wide text-text-muted">
            {d}
          </div>
        ))}
      </div>
      {weeks.map((week) => (
        <div key={week[0].date} role="row" className="grid grid-cols-7 border-b border-border last:border-0">
          {week.map(({ date, inMonth }) => {
            const chips = inMonth ? chipsFor(date, holidays, pending) : []
            const { shown, more } = visibleChips(chips)
            const shade = inMonth ? shadeFor(date, show, weeklyRules, holidays) : null
            const isToday = date === today
            const past = date < today
            return (
              <button
                key={date}
                type="button"
                role="gridcell"
                onClick={() => onOpenDay(date)}
                aria-label={`${formatDate(date)}${chips.length ? `, ${chips.map((c) => c.label).join(', ')}` : ''}${shade ? `, ${SHADE_STYLE[shade].label}` : ''}`}
                className={cn(
                  'relative flex min-h-24 flex-col gap-1 border-r border-border p-1.5 text-left transition-colors last:border-r-0 hover:bg-brand-soft/60 focus-visible:z-10',
                  shade && SHADE_STYLE[shade].cell,
                  !inMonth && 'bg-surface-sunken text-text-disabled',
                  isToday && 'outline outline-2 -outline-offset-2 outline-primary',
                )}
              >
                <span className="flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      'tabular text-xs font-semibold',
                      !inMonth
                        ? 'font-normal text-text-disabled'
                        : isToday
                          ? 'flex size-5 items-center justify-center rounded-full bg-primary text-surface'
                          : past
                            ? 'text-text-muted'
                            : 'text-text',
                    )}
                  >
                    {Number(date.slice(8))}
                  </span>
                  {shade && <span className="truncate text-[10px] text-text-muted">{SHADE_STYLE[shade].label}</span>}
                </span>
                <span className={cn('flex flex-col gap-0.5', past && 'opacity-70')}>
                  {shown.map((c) => (
                    <HolidayChip key={c.key} chip={c} />
                  ))}
                  {more > 0 && <span className="px-1 text-[11px] font-medium text-primary">+{more} more</span>}
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function Agenda({ month, today, show, holidays, pending, weeklyRules, onOpenDay }: MonthGridProps) {
  const days = monthMatrix(month, 1)
    .flat()
    .filter((d) => d.inMonth)
    .map((d) => ({ date: d.date, chips: chipsFor(d.date, holidays, pending), shade: shadeFor(d.date, show, weeklyRules, holidays) }))
  const busy = days.filter((d) => d.chips.length > 0 || d.shade === 'category')
  const offDays = [...new Set(days.filter((d) => d.shade === 'weekly').map((d) => weekdayOf(d.date)))]
  return (
    <div>
      {offDays.length > 0 && (
        <p className="border-b border-border px-4 py-2 text-xs text-text-muted">
          Weekly holiday: {offDays.map((d) => WEEKDAY_NAMES[d]).join(', ')}
        </p>
      )}
      {busy.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-text-muted">No holidays this month.</p>
      ) : (
        <ul className="divide-y divide-border">
          {busy.map((d) => (
            <li key={d.date}>
              <button
                type="button"
                onClick={() => onOpenDay(d.date)}
                className={cn('flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-surface-hover', d.date < today && 'opacity-70')}
              >
                <span className={cn('w-12 shrink-0 text-center', d.date === today && 'text-primary')}>
                  <span className="block text-lg font-semibold tabular leading-tight">{Number(d.date.slice(8))}</span>
                  <span className="block text-[11px] uppercase text-text-muted">{WEEKDAY_NAMES[weekdayOf(d.date)].slice(0, 3)}</span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  {d.chips.map((c) => (
                    <HolidayChip key={c.key} chip={c} className="text-xs" />
                  ))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
