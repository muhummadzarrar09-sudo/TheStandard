import { describe, it, expect } from 'vitest'
import { rowToBlock } from '../lib/schedule-source-shared'

describe('rowToBlock', () => {
  it('maps a canonical row to a ScheduleBlock', () => {
    const block = rowToBlock({
      key: 'wake',
      start_time: '05:00:00',
      end_time: '05:30:00',
      label: 'Wake, hydrate, light movement',
      required: true,
      critical: false,
      sort_order: 1
    })
    expect(block).toEqual({
      key: 'wake',
      start: '05:00',
      end: '05:30',
      label: 'Wake, hydrate, light movement',
      required: true,
      critical: false
    })
  })

  it('drops end when null', () => {
    const block = rowToBlock({
      key: 'sleep',
      start_time: '21:00:00',
      end_time: null,
      label: 'Wind down',
      required: false,
      critical: false,
      sort_order: 99
    })
    expect(block.end).toBeUndefined()
  })

  it('truncates HH:MM:SS to HH:MM', () => {
    expect(rowToBlock({
      key: 'k', start_time: '07:00:00', end_time: '09:00:00', label: 'l',
      required: true, critical: true, sort_order: 1
    }).start).toBe('07:00')
  })

  it('preserves the critical flag', () => {
    expect(rowToBlock({
      key: 'deep-1', start_time: '07:00:00', end_time: '09:00:00', label: 'l',
      required: true, critical: true, sort_order: 4
    }).critical).toBe(true)
    expect(rowToBlock({
      key: 'break-1', start_time: '09:00:00', end_time: '09:15:00', label: 'l',
      required: true, critical: false, sort_order: 5
    }).critical).toBe(false)
  })
})
