import { describe, it, expect } from 'vitest'
import { isValidEmail, normalizeEmail, plausibleDeviceId } from '../lib/auth'

describe('isValidEmail', () => {
  it('accepts well-formed addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true)
    expect(isValidEmail('user+tag@example.co.uk')).toBe(true)
    expect(isValidEmail('first.last@sub.example.io')).toBe(true)
  })
  it('rejects malformed addresses', () => {
    expect(isValidEmail('a@b.c')).toBe(false)            // TLD too short
    expect(isValidEmail('no-at-sign')).toBe(false)
    expect(isValidEmail('user@')).toBe(false)
    expect(isValidEmail('@example.com')).toBe(false)
    expect(isValidEmail('user @example.com')).toBe(false)
    expect(isValidEmail('user@@example.com')).toBe(false)
  })
  it('rejects non-string values', () => {
    expect(isValidEmail(null)).toBe(false)
    expect(isValidEmail(undefined)).toBe(false)
    expect(isValidEmail(42)).toBe(false)
    expect(isValidEmail({})).toBe(false)
  })
})

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  User@Example.com  ')).toBe('user@example.com')
  })
})

describe('plausibleDeviceId', () => {
  it('accepts printable ASCII in the right range', () => {
    expect(plausibleDeviceId('device-abc-123')).toBe(true)
    expect(plausibleDeviceId('a'.repeat(8))).toBe(true)
    expect(plausibleDeviceId('a'.repeat(128))).toBe(true)
  })
  it('rejects too short, too long, or odd characters', () => {
    expect(plausibleDeviceId('short')).toBe(false)
    expect(plausibleDeviceId('a'.repeat(129))).toBe(false)
    expect(plausibleDeviceId('has space here!')).toBe(false)
    expect(plausibleDeviceId('weird/chars')).toBe(false)
  })
  it('rejects non-string', () => {
    expect(plausibleDeviceId(42)).toBe(false)
    expect(plausibleDeviceId(null)).toBe(false)
  })
})
