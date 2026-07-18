// Current streak: count today and consecutive prior days that are all in
// the set. If today is missing (not yet completed), skip it once and check
// yesterday. If yesterday is also missing, the streak is broken (PRD 7.2:
// "any missed required block breaks the active streak").
export function consecutiveDays(completedDates: string[], today: string): number {
  const set = new Set(completedDates)
  const dayMs = 86400000
  const todayDate = new Date(`${today}T00:00:00Z`)
  let prev = new Date(todayDate)
  let skipped = false
  // Find the first day at or before today that is in the set.
  while (true) {
    const key = prev.toISOString().slice(0, 10)
    if (set.has(key)) break
    if (!skipped && key === today) {
      skipped = true
      prev = new Date(prev.getTime() - dayMs)
      continue
    }
    return 0
  }
  // Count consecutive days.
  let count = 0
  while (set.has(prev.toISOString().slice(0, 10))) {
    count++
    prev = new Date(prev.getTime() - dayMs)
  }
  return count
}

// Best streak: longest run of consecutive local_date values in the set.
export function bestStreak(completedDates: string[]): number {
  if (completedDates.length === 0) return 0
  const sorted = [...new Set(completedDates)].sort()
  let best = 0
  let current = 0
  let prev: Date | null = null
  for (const date of sorted) {
    const d = new Date(`${date}T00:00:00Z`)
    const consecutive = prev !== null && (d.getTime() - prev.getTime()) === 86400000
    current = consecutive ? current + 1 : 1
    if (current > best) best = current
    prev = d
  }
  return best
}
