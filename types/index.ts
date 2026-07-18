export type User = { id: string; email: string; cohortId: string; timezone: string; themePreset: string }
export type Team = { id: string; name: string; ideaName: string; objective: string }
export type CheckIn = { id: string; userId: string; localDate: string; blockKey: string; status: 'completed'|'missed'|'optional' }
export type Report = { id: string; title: string; publishedAt: string; summary: string; version: number }
export type DeviceSession = { id: string; label: string; lastSeenAt: string; revokedAt?: string }
