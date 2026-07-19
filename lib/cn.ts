// A tiny classname joiner. We don't pull in clsx/classnames because
// the project's use is limited: filter out falsy, join with spaces.
// The codebase still uses inline styles for the layout primitives
// (margin, padding, grid, flex) because the original brand spec
// was authored as 100+ pages of one-offs and a refactor to a
// design system is out of scope for this phase. cn() is here for
// the cases where a class is conditional — e.g. nav items that are
// active vs. inactive, or buttons that vary by state.

export type ClassValue = string | false | null | undefined

export function cn(...values: ClassValue[]): string {
  return values.filter((v): v is string => typeof v === 'string' && v.length > 0).join(' ')
}
