export type NotificationCategory =
  | 'daily_reminder'
  | 'report_alerts'
  | 'team_messages'
  | 'critical_block'

export type NotificationPreference = {
  daily_reminder: boolean
  report_alerts: boolean
  team_messages: boolean
  critical_block_reminder: boolean
  quiet_start?: string | null
  quiet_end?: string | null
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

// Convert "HH:MM" to minutes-since-midnight. Returns -1 on invalid input.
function toMinutes(hhmm: string): number {
  if (!TIME_RE.test(hhmm)) return -1
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function withinQuietHours(localTime: string, p: NotificationPreference): boolean {
  if (!p.quiet_start || !p.quiet_end) return false
  const start = toMinutes(p.quiet_start)
  const end = toMinutes(p.quiet_end)
  const t = toMinutes(localTime.slice(0, 5))
  if (t < 0 || start < 0 || end < 0) return false
  if (start <= end) {
    return t >= start && t < end
  }
  // Quiet hours cross midnight (e.g. 22:00 - 06:00)
  return t >= start || t < end
}

export function shouldSend(
  category: NotificationCategory,
  localTime: string,
  p: NotificationPreference
): boolean {
  if (withinQuietHours(localTime, p)) return false
  switch (category) {
    case 'daily_reminder':  return p.daily_reminder
    case 'report_alerts':   return p.report_alerts
    case 'team_messages':   return p.team_messages
    case 'critical_block':  return p.critical_block_reminder
  }
}
