import { describe, it, expect } from 'vitest'
import {
  validTimezone,
  validClientEventId,
  isUuid,
  isIsoDate,
  isHHMM,
  isBoundedString,
  isOneOf,
  trimToRange
} from '../lib/validation/schedule'

describe('validTimezone', () => {
  it('accepts IANA timezone names', () => {
    expect(validTimezone('UTC')).toBe(true)
    expect(validTimezone('America/Los_Angeles')).toBe(true)
    expect(validTimezone('Asia/Karachi')).toBe(true)
    expect(validTimezone('Pacific/Chatham')).toBe(true)
  })
  it('rejects non-IANA strings', () => {
    expect(validTimezone('PDT')).toBe(false)
    expect(validTimezone('not-a-tz')).toBe(false)
    expect(validTimezone('GMT+5')).toBe(false)
  })
  it('rejects non-strings', () => {
    expect(validTimezone(null)).toBe(false)
    expect(validTimezone(42)).toBe(false)
    expect(validTimezone(undefined)).toBe(false)
  })
})

describe('validClientEventId', () => {
  it('accepts UUID-like 8..100 char strings', () => {
    expect(validClientEventId('abcd1234')).toBe(true)
    expect(validClientEventId('a-b_c-12345678')).toBe(true)
    expect(validClientEventId('a'.repeat(100))).toBe(true)
  })
  it('rejects too short, too long, or odd chars', () => {
    expect(validClientEventId('short')).toBe(false)
    expect(validClientEventId('a'.repeat(101))).toBe(false)
    expect(validClientEventId('has space')).toBe(false)
    expect(validClientEventId('weird/chars')).toBe(false)
  })
  it('rejects non-strings', () => {
    expect(validClientEventId(42)).toBe(false)
    expect(validClientEventId(null)).toBe(false)
  })
})

describe('isUuid', () => {
  it('accepts v4 UUIDs', () => {
    expect(isUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true)
    expect(isUuid('123E4567-E89B-12D3-A456-426614174000')).toBe(true)
  })
  it('rejects non-UUIDs', () => {
    expect(isUuid('not-a-uuid')).toBe(false)
    expect(isUuid('123e4567-e89b-12d3-a456')).toBe(false)
    expect(isUuid('')).toBe(false)
  })
  it('rejects non-strings', () => {
    expect(isUuid(42)).toBe(false)
    expect(isUuid(null)).toBe(false)
  })
})

describe('isIsoDate', () => {
  it('accepts valid YYYY-MM-DD', () => {
    expect(isIsoDate('2026-07-18')).toBe(true)
    expect(isIsoDate('2028-02-29')).toBe(true)  // leap day
  })
  it('rejects invalid dates', () => {
    expect(isIsoDate('2026-13-01')).toBe(false)
    expect(isIsoDate('2026-07-32')).toBe(false)
    expect(isIsoDate('26-07-18')).toBe(false)
    expect(isIsoDate('2026/07/18')).toBe(false)
    expect(isIsoDate('')).toBe(false)
  })
  it('rejects non-strings', () => {
    expect(isIsoDate(20260718)).toBe(false)
    expect(isIsoDate(null)).toBe(false)
  })
})

describe('isHHMM', () => {
  it('accepts 24-hour HH:MM', () => {
    expect(isHHMM('00:00')).toBe(true)
    expect(isHHMM('13:30')).toBe(true)
    expect(isHHMM('23:59')).toBe(true)
  })
  it('rejects out-of-range or wrong format', () => {
    expect(isHHMM('24:00')).toBe(false)
    expect(isHHMM('13:60')).toBe(false)
    expect(isHHMM('1:30')).toBe(false)
    expect(isHHMM('13:30:00')).toBe(false)
  })
  it('rejects non-strings', () => {
    expect(isHHMM(1330)).toBe(false)
  })
})

describe('isBoundedString', () => {
  it('checks length within bounds', () => {
    expect(isBoundedString('hello', 1, 10)).toBe(true)
    expect(isBoundedString('hello', 5, 5)).toBe(true)
    expect(isBoundedString('hi', 3, 5)).toBe(false)
    expect(isBoundedString('too long for sure', 1, 5)).toBe(false)
  })
  it('rejects non-strings', () => {
    expect(isBoundedString(42, 1, 10)).toBe(false)
    expect(isBoundedString(null, 1, 10)).toBe(false)
  })
})

describe('isOneOf', () => {
  it('narrows to the literal type', () => {
    const allowed = ['planned', 'in_progress', 'blocked', 'complete'] as const
    const v: unknown = 'planned'
    if (isOneOf(v, allowed)) {
      // TypeScript would catch a misuse; this is a smoke test
      expect(allowed.includes(v)).toBe(true)
    }
    expect(isOneOf('unknown', allowed)).toBe(false)
    expect(isOneOf(42, allowed)).toBe(false)
  })
})

describe('trimToRange', () => {
  it('trims and accepts within bounds', () => {
    expect(trimToRange('  hello  ', 1, 10)).toBe('hello')
  })
  it('rejects out of bounds', () => {
    expect(trimToRange('  ', 1, 10)).toBe(null)
    expect(trimToRange('a'.repeat(20), 1, 10)).toBe(null)
  })
  it('rejects non-strings', () => {
    expect(trimToRange(42, 1, 10)).toBe(null)
  })
})
