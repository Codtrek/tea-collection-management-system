import { describe, expect, it } from 'vitest'
import { agentHistoryHref, COLLECTIONS_TAB, resolveEmployeeTab } from './links'

describe('agentHistoryHref — dispatch "View history"', () => {
  it('goes to the agent’s EMPLOYEE page, on the Collections tab', () => {
    expect(agentHistoryHref('EMP-0012')).toBe('/employees/EMP-0012?tab=collections')
  })

  it('uses the same tab id the Employee page registers', () => {
    expect(agentHistoryHref('EMP-0001')).toContain(`tab=${COLLECTIONS_TAB}`)
  })
})

describe('resolveEmployeeTab — the link lands on the right tab', () => {
  const agentTabs = ['overview', 'employment', 'collections', 'bank', 'attendance']
  const plainTabs = ['overview', 'employment', 'bank', 'attendance']

  it('opens Collections when an agent’s page is requested with ?tab=collections', () => {
    expect(resolveEmployeeTab('collections', agentTabs)).toBe('collections')
  })

  it('defaults to Overview with no ?tab', () => {
    expect(resolveEmployeeTab(null, agentTabs)).toBe('overview')
  })

  it('falls back to Overview if the Collections tab is not available to this viewer or employee', () => {
    // not an agent, or no collection access → the tab isn't in the list
    expect(resolveEmployeeTab('collections', plainTabs)).toBe('overview')
  })

  it('ignores an unknown tab', () => {
    expect(resolveEmployeeTab('nope', agentTabs)).toBe('overview')
  })

  it('still supports the other tabs by URL', () => {
    expect(resolveEmployeeTab('bank', agentTabs)).toBe('bank')
  })
})
