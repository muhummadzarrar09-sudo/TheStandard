import { describe, it, expect } from 'vitest'
import { cn } from '../lib/cn'

describe('cn', () => {
  it('joins truthy strings with a space', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c')
  })
  it('drops false, null, and undefined', () => {
    expect(cn('a', false, 'b', null, 'c', undefined)).toBe('a b c')
  })
  it('drops empty strings', () => {
    expect(cn('a', '', 'b')).toBe('a b')
  })
  it('returns an empty string for no inputs', () => {
    expect(cn()).toBe('')
  })
  it('returns an empty string for all-falsy inputs', () => {
    expect(cn(false, null, undefined)).toBe('')
  })
  it('preserves the order of inputs', () => {
    expect(cn('z', 'a', 'm')).toBe('z a m')
  })
})
