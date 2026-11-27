import { describe, expect, it } from 'vitest'
import { DEFAULT_PERMISSIONS } from '@/context/permissions'
import type { ModuleKey } from '@/types'
import {
  allowedLevels,
  cellLock,
  describeChange,
  diffMatrix,
  LEVEL_LABELS,
  needsReason,
  PERMISSION_CATALOG,
  type Matrix,
} from './permission-catalog'

const ALL_KEYS = Object.keys(DEFAULT_PERMISSIONS.Administrator) as ModuleKey[]

describe('permission catalog', () => {
  it('every permission key is a matrix row, exactly once', () => {
    const listed = new Set(PERMISSION_CATALOG.map((i) => i.key))
    expect(listed.size).toBe(PERMISSION_CATALOG.length)
    expect(ALL_KEYS.filter((k) => !listed.has(k))).toEqual([])
    expect(PERMISSION_CATALOG.every((i) => i.label && i.description)).toBe(true)
  })

  it('full level names, never blank', () => {
    expect(Object.values(LEVEL_LABELS)).toEqual(['None', 'View', 'Edit', 'Approve'])
  })

  it('locks: Administrator pinned except the separated keys, which offer only None / View', () => {
    expect(cellLock('Administrator', 'collection')).toBe('pinned')
    expect(cellLock('Administrator', 'gradingApproval')).toBe('capped')
    expect(allowedLevels('Administrator', 'expenses')).toEqual(['none', 'view'])
    expect(cellLock('Manager', 'collection')).toBeNull()
    expect(allowedLevels('Officer', 'collection')).toEqual(['none', 'view', 'edit', 'approve'])
  })
})

describe('dirty state and the reason rule', () => {
  const saved: Matrix = {
    Administrator: { collection: 'approve', expenses: 'view' },
    Officer: { expenses: 'edit', dispatch: 'view' },
    Manager: { dispatch: 'approve' },
  }

  it('lists only changed, editable cells; a missing cell counts as None', () => {
    const draft: Matrix = {
      ...saved,
      Officer: { expenses: 'view', dispatch: 'view', collection: 'none' },
      Administrator: { collection: 'view', expenses: 'none' }, // pinned cell ignored
    }
    const changes = diffMatrix(saved, draft)
    expect(changes.map(describeChange)).toEqual([
      'Administrator · Daily expenses: View → None',
      'Officer · Daily expenses: Edit → View',
    ])
  })

  it('needs a reason for approve (either side) or a finance key', () => {
    expect(needsReason([{ role: 'Officer', key: 'dispatch', from: 'view', to: 'edit' }])).toBe(false)
    expect(needsReason([{ role: 'Manager', key: 'dispatch', from: 'approve', to: 'edit' }])).toBe(true)
    expect(needsReason([{ role: 'Officer', key: 'expenses', from: 'edit', to: 'view' }])).toBe(true)
  })
})
