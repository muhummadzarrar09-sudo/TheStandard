// Copy table. Every user-visible string in the app comes from here so
// future translation is mechanical: add a `de` (or `es`, `fr`, ...)
// block alongside the `en` block and a thin t(key, locale) helper
// returns the right string.
//
// For now, all locales other than `en` fall back to English. The
// structure is in place; the translations land as a follow-up.

export type Locale = 'en' | 'es'

export type CopyKey =
  | 'app.brand'
  | 'app.brandSub'
  | 'app.tagline'
  | 'app.howItWorksEyebrow'
  | 'app.howItWorks1'
  | 'app.howItWorks2'
  | 'app.howItWorks3'
  | 'app.howItWorks4'
  | 'app.memberSignin'
  | 'app.landingCta'
  | 'rail.today'
  | 'rail.schedule'
  | 'rail.tracker'
  | 'rail.team'
  | 'rail.teamChat'
  | 'rail.leaderboard'
  | 'rail.reports'
  | 'rail.community'
  | 'rail.settings'
  | 'rail.profile'
  | 'rail.admin.members'
  | 'rail.admin.enrollment'
  | 'rail.admin.teams'
  | 'rail.admin.schedule'
  | 'rail.admin.analytics'
  | 'rail.admin.reports'
  | 'skipToContent'
  | 'notFound.eyebrow'
  | 'notFound.title'
  | 'notFound.body'
  | 'notFound.cta'
  | 'notFound.signin'
  | 'loading.eyebrow'
  | 'loading.title'
  | 'loading.body'
  | 'public.memberAccess'
  | 'public.verifyEmail'
  | 'today.heading'
  | 'today.completionEyebrow'
  | 'today.upNextEyebrow'
  | 'today.allCompleteTitle'
  | 'today.allCompleteDetail'
  | 'today.dayLabel'
  | 'tracker.heading'
  | 'tracker.currentStreak'
  | 'tracker.bestStreak'
  | 'tracker.weeklyReview'
  | 'tracker.daysOf'
  | 'leaderboard.heading'
  | 'leaderboard.subtitle'
  | 'leaderboard.viewAll'
  | 'leaderboard.viewTeam'
  | 'leaderboard.viewWeek'
  | 'leaderboard.colRank'
  | 'leaderboard.colMember'
  | 'leaderboard.colStreak'
  | 'leaderboard.colDays'
  | 'leaderboard.colComplete'
  | 'leaderboard.colWeek'
  | 'leaderboard.empty'
  | 'leaderboard.unavailable'
  | 'leaderboard.tieExplanation'
  | 'sync.indicatorAria'
  | 'team.heading'
  | 'team.emptyTitle'
  | 'team.emptyDetail'
  | 'team.objective'
  | 'team.cadence'
  | 'team.openChat'
  | 'team.progressCategoryUpdate'
  | 'team.progressCategoryBlocker'
  | 'team.progressCategoryMilestone'
  | 'team.progressCategoryIdea'
  | 'team.progressCategory'
  | 'team.chatEyebrow'
  | 'team.chatNotAssigned'
  | 'team.chatPendingEyebrow'
  | 'team.chatPendingTitle'
  | 'team.chatPendingBody'
  | 'chat.heading'
  | 'chat.eyebrow'
  | 'chat.empty'
  | 'chat.send'
  | 'chat.sending'
  | 'chat.failed'
  | 'chat.retry'
  | 'chat.offline'
  | 'chat.connected'
  | 'chat.connecting'
  | 'chat.loadOlder'
  | 'chat.loadingMore'
  | 'chat.inputPlaceholder'
  | 'chat.inputLabel'
  | 'chat.sendLabel'
  | 'chat.retryAria'
  | 'chat.errorNotSignedIn'
  | 'chat.errorSendFailed'
  | 'chat.ariaYouAt'
  | 'chat.ariaTeammateAt'
  | 'settings.heading'
  | 'settings.themeEyebrow'
  | 'settings.themeDescription'
  | 'settings.notificationsEyebrow'
  | 'settings.securityEyebrow'
  | 'settings.devicesLink'
  | 'login.heading'
  | 'login.subtitle'
  | 'login.emailLabel'
  | 'login.submit'
  | 'login.sending'
  | 'login.error'
  | 'verify.heading'
  | 'verify.subtitle'
  | 'verify.codeLabel'
  | 'verify.submit'
  | 'verify.verifying'
  | 'verify.error'
  | 'verify.resend'
  | 'verify.invalidCode'
  | 'verify.sentNew'
  | 'verify.resendFailed'
  | 'verify.codeInputAria'

type CopyTable = Record<Locale, Record<CopyKey, string>>

const en: Record<CopyKey, string> = {
  'app.brand': 'DISCIPLINE',
  'app.brandSub': 'EXECUTION SYSTEM',
  'app.tagline': 'A 30-day execution system for disciplined daily work, team accountability, and startup progress.',
  'app.howItWorksEyebrow': 'HOW IT WORKS',
  'app.howItWorks1': 'One standard schedule. Wake at 05:00. Deep work, lunch, team, reflection. The same structure every day so execution becomes automatic.',
  'app.howItWorks2': 'One cohort. 3–4 people per team. Daily check-ins, weekly commitments, shared chat. Accountability without surveillance.',
  'app.howItWorks3': 'One leaderboard. Ranked by current streak, completion percentage, completed days. Private reflections stay private.',
  'app.howItWorks4': 'One rhythm. Reminders fire at your local cutoff. Reports land in the library. Nothing else.',
  'app.memberSignin': 'Member sign-in',
  'app.landingCta': 'Enter the system →',
  'rail.today': 'Today',
  'rail.schedule': 'Schedule',
  'rail.tracker': 'Tracker',
  'rail.team': 'Team room',
  'rail.teamChat': 'Chat',
  'rail.leaderboard': 'Leaderboard',
  'rail.reports': 'Reports',
  'rail.community': 'Community',
  'rail.settings': 'Settings',
  'rail.profile': 'Profile',
  'rail.admin.members': 'Members',
  'rail.admin.enrollment': 'Enrollment',
  'rail.admin.teams': 'Teams',
  'rail.admin.schedule': 'Schedule',
  'rail.admin.analytics': 'Analytics',
  'rail.admin.reports': 'Reports',
  'skipToContent': 'Skip to content',
  'notFound.eyebrow': '404 · NOT ON THE SCHEDULE',
  'notFound.title': 'This page does not exist.',
  'notFound.body': 'The link you followed does not match a surface in the system. If you got here from a notification, the link may be from a previous cohort. Return to the execution dashboard and take the next commitment.',
  'notFound.cta': 'Return to Today →',
  'notFound.signin': 'Sign in',
  'loading.eyebrow': 'DISCIPLINE OS',
  'loading.title': 'Preparing your day…',
  'loading.body': 'Loading the standard and checking your local time.',
  'public.memberAccess': 'MEMBER ACCESS',
  'public.verifyEmail': 'VERIFY EMAIL',
  'today.heading': 'Your standard for today.',
  'today.completionEyebrow': "TODAY'S COMPLETION",
  'today.upNextEyebrow': 'UP NEXT',
  'today.allCompleteTitle': 'All required blocks complete',
  'today.allCompleteDetail': 'Day {day} locked in. Streak extends tomorrow.',
  'today.dayLabel': 'DAY {day}',
  'tracker.heading': 'See the pattern.',
  'tracker.currentStreak': 'CURRENT STREAK',
  'tracker.bestStreak': 'BEST STREAK',
  'tracker.weeklyReview': 'WEEKLY REVIEW',
  'tracker.daysOf': '{done} of 30 days complete. Review the pattern, then choose the next standard.',
  'leaderboard.heading': 'Keep the line.',
  'leaderboard.subtitle': 'Ranked by current streak, completion percentage, completed days, then join time. Your private reflections never appear here.',
  'leaderboard.viewAll': 'All members',
  'leaderboard.viewTeam': 'My team',
  'leaderboard.viewWeek': 'This week',
  'leaderboard.colRank': 'RANK',
  'leaderboard.colMember': 'MEMBER',
  'leaderboard.colStreak': 'STREAK',
  'leaderboard.colDays': 'DAYS',
  'leaderboard.colComplete': 'COMPLETE',
  'leaderboard.colWeek': 'WEEK',
  'leaderboard.empty': 'No leaderboard data yet. The first completed day will appear here.',
  'leaderboard.unavailable': 'Leaderboard temporarily unavailable. Try again in a moment.',
  'leaderboard.tieExplanation': 'Tie-breakers (in order): current streak, completion percentage, completed days, join time. This week view also ranks by check-ins in the last 7 days.',
  'sync.indicatorAria': 'Offline sync status',
  'team.heading': 'Build together.',
  'team.emptyTitle': 'Your team is being assembled.',
  'team.emptyDetail': "The team room opens once the cohort lead finalizes team assignments. You'll see your team, its idea, and the team's execution chat here.",
  'team.objective': 'CURRENT OBJECTIVE',
  'team.cadence': 'WEEKLY CADENCE',
  'team.openChat': 'Open execution chat →',
  'team.progressCategory': 'Category',
  'team.progressCategoryUpdate': 'Update',
  'team.progressCategoryBlocker': 'Blocker',
  'team.progressCategoryMilestone': 'Milestone',
  'team.progressCategoryIdea': 'Idea',
  'team.chatEyebrow': 'TEAM CHAT',
  'team.chatNotAssigned': 'No team assigned yet.',
  'team.chatPendingEyebrow': 'PENDING',
  'team.chatPendingTitle': 'Team chat opens with your team assignment.',
  'team.chatPendingBody': 'Once the cohort lead assigns your team, this page becomes your private execution room.',
  'chat.heading': 'Team chat.',
  'chat.eyebrow': 'PRIVATE EXECUTION ROOM',
  'chat.empty': 'No messages yet. Be the first to start the room.',
  'chat.send': 'Send →',
  'chat.sending': 'sending…',
  'chat.failed': 'failed · tap to retry',
  'chat.retry': 'failed',
  'chat.offline': 'Offline',
  'chat.connected': 'Live',
  'chat.connecting': 'Connecting…',
  'chat.loadOlder': 'Load older messages',
  'chat.loadingMore': 'Loading…',
  'chat.inputPlaceholder': 'Message your team…',
  'chat.inputLabel': 'Message your team',
  'chat.sendLabel': 'Send message',
  'chat.retryAria': 'Retry',
  'chat.errorNotSignedIn': 'You must be signed in to send a message.',
  'chat.errorSendFailed': 'Could not send. Tap retry.',
  'chat.ariaYouAt': 'You at {time}',
  'chat.ariaTeammateAt': 'Teammate at {time}',
  'settings.heading': 'Set your environment.',
  'settings.themeEyebrow': 'STYLE PRESET',
  'settings.themeDescription': 'The structure stays the same. The way it feels is yours.',
  'settings.notificationsEyebrow': 'NOTIFICATIONS',
  'settings.securityEyebrow': 'SECURITY',
  'settings.devicesLink': 'Manage active devices →',
  'login.heading': 'Enter your email.',
  'login.subtitle': "We'll send a six-digit code. No password. No magic link.",
  'login.emailLabel': 'EMAIL ADDRESS',
  'login.submit': 'Send access code →',
  'login.sending': 'Sending…',
  'login.error': 'We could not send a code. Confirm your enrollment email and try again.',
  'verify.heading': 'Enter your code.',
  'verify.subtitle': 'Code sent to {email} · expires shortly · one use only.',
  'verify.codeLabel': 'SIX-DIGIT CODE',
  'verify.submit': 'Continue →',
  'verify.verifying': 'Verifying…',
  'verify.error': 'That code is invalid or expired. Request a new one and try again.',
  'verify.resend': 'Resend code',
  'verify.invalidCode': 'Enter the six-digit code.',
  'verify.sentNew': 'A new code was sent.',
  'verify.resendFailed': 'Unable to resend right now. Please wait and try again.',
  'verify.codeInputAria': 'Six-digit verification code'
}

const es: Record<CopyKey, string> = {
  'app.brand': 'DISCIPLINA',
  'app.brandSub': 'SISTEMA DE EJECUCIÓN',
  'app.tagline': 'Un sistema de ejecución de 30 días para trabajo disciplinado, responsabilidad de equipo y progreso de startup.',
  'app.howItWorksEyebrow': 'CÓMO FUNCIONA',
  'app.howItWorks1': 'Un horario estándar. Despertar a las 05:00. Trabajo profundo, almuerzo, equipo, reflexión. La misma estructura cada día.',
  'app.howItWorks2': 'Una cohorte. 3–4 personas por equipo. Check-ins diarios, compromisos semanales, chat compartido.',
  'app.howItWorks3': 'Un ranking. Por racha actual, porcentaje de finalización, días completados. Las reflexiones privadas son privadas.',
  'app.howItWorks4': 'Un ritmo. Los recordatorios se disparan a tu hora local. Los informes llegan a la biblioteca. Nada más.',
  'app.memberSignin': 'Acceso de miembros',
  'app.landingCta': 'Entrar al sistema →',
  'rail.today': 'Hoy',
  'rail.schedule': 'Horario',
  'rail.tracker': 'Registro',
  'rail.team': 'Sala del equipo',
  'rail.teamChat': 'Chat',
  'rail.leaderboard': 'Ranking',
  'rail.reports': 'Informes',
  'rail.community': 'Comunidad',
  'rail.settings': 'Ajustes',
  'rail.profile': 'Perfil',
  'rail.admin.members': 'Miembros',
  'rail.admin.enrollment': 'Inscripción',
  'rail.admin.teams': 'Equipos',
  'rail.admin.schedule': 'Horario',
  'rail.admin.analytics': 'Analítica',
  'rail.admin.reports': 'Informes',
  'skipToContent': 'Saltar al contenido',
  'notFound.eyebrow': '404 · NO ESTÁ EN EL HORARIO',
  'notFound.title': 'Esta página no existe.',
  'notFound.body': 'El enlace que seguiste no corresponde a una superficie del sistema. Vuelve al panel y toma el siguiente compromiso.',
  'notFound.cta': 'Volver a Hoy →',
  'notFound.signin': 'Iniciar sesión',
  'loading.eyebrow': 'DISCIPLINA OS',
  'loading.title': 'Preparando tu día…',
  'loading.body': 'Cargando el estándar y verificando tu hora local.',
  'public.memberAccess': 'ACCESO DE MIEMBROS',
  'public.verifyEmail': 'VERIFICAR EMAIL',
  'today.heading': 'Tu estándar de hoy.',
  'today.completionEyebrow': 'COMPLETADO HOY',
  'today.upNextEyebrow': 'SIGUIENTE',
  'today.allCompleteTitle': 'Todos los bloques obligatorios listos',
  'today.allCompleteDetail': 'Día {day} cerrado. La racha continúa mañana.',
  'today.dayLabel': 'DÍA {day}',
  'tracker.heading': 'Mira el patrón.',
  'tracker.currentStreak': 'RACHA ACTUAL',
  'tracker.bestStreak': 'MEJOR RACHA',
  'tracker.weeklyReview': 'REVISIÓN SEMANAL',
  'tracker.daysOf': '{done} de 30 días completados. Revisa el patrón y elige el próximo estándar.',
  'leaderboard.heading': 'Mantén la línea.',
  'leaderboard.subtitle': 'Por racha actual, porcentaje, días completados, hora de ingreso. Tus reflexiones privadas nunca aparecen aquí.',
  'leaderboard.viewAll': 'Todos',
  'leaderboard.viewTeam': 'Mi equipo',
  'leaderboard.viewWeek': 'Esta semana',
  'leaderboard.colRank': 'PUESTO',
  'leaderboard.colMember': 'MIEMBRO',
  'leaderboard.colStreak': 'RACHA',
  'leaderboard.colDays': 'DÍAS',
  'leaderboard.colComplete': 'COMPLETO',
  'leaderboard.colWeek': 'SEMANA',
  'leaderboard.empty': 'Aún no hay datos. El primer día completado aparecerá aquí.',
  'leaderboard.unavailable': 'Ranking no disponible. Vuelve a intentarlo en un momento.',
  'leaderboard.tieExplanation': 'Desempates (en orden): racha actual, porcentaje, días completados, hora de ingreso.',
  'sync.indicatorAria': 'Estado de sincronización',
  'team.heading': 'Construyan juntos.',
  'team.emptyTitle': 'Tu equipo se está formando.',
  'team.emptyDetail': 'La sala del equipo se abre cuando el líder de la cohorte finalice las asignaciones.',
  'team.objective': 'OBJETIVO ACTUAL',
  'team.cadence': 'CADENCIA SEMANAL',
  'team.openChat': 'Abrir chat de ejecución →',
  'team.progressCategory': 'Categoría',
  'team.progressCategoryUpdate': 'Actualización',
  'team.progressCategoryBlocker': 'Bloqueo',
  'team.progressCategoryMilestone': 'Hito',
  'team.progressCategoryIdea': 'Idea',
  'team.chatEyebrow': 'CHAT DE EQUIPO',
  'team.chatNotAssigned': 'Aún no tienes equipo asignado.',
  'team.chatPendingEyebrow': 'PENDIENTE',
  'team.chatPendingTitle': 'El chat se abre con la asignación de equipo.',
  'team.chatPendingBody': 'Cuando el líder de la cohorte te asigne un equipo, esta página será tu sala privada.',
  'chat.heading': 'Chat de equipo.',
  'chat.eyebrow': 'SALA DE EJECUCIÓN PRIVADA',
  'chat.empty': 'Aún no hay mensajes. Sé el primero.',
  'chat.send': 'Enviar →',
  'chat.sending': 'enviando…',
  'chat.failed': 'falló · toca para reintentar',
  'chat.retry': 'falló',
  'chat.offline': 'Sin conexión',
  'chat.connected': 'En vivo',
  'chat.connecting': 'Conectando…',
  'chat.loadOlder': 'Cargar mensajes anteriores',
  'chat.loadingMore': 'Cargando…',
  'chat.inputPlaceholder': 'Mensaje a tu equipo…',
  'chat.inputLabel': 'Mensaje a tu equipo',
  'chat.sendLabel': 'Enviar mensaje',
  'chat.retryAria': 'Reintentar',
  'chat.errorNotSignedIn': 'Debes iniciar sesión para enviar un mensaje.',
  'chat.errorSendFailed': 'No se pudo enviar. Toca reintentar.',
  'chat.ariaYouAt': 'Tú a las {time}',
  'chat.ariaTeammateAt': 'Compañero a las {time}',
  'settings.heading': 'Configura tu entorno.',
  'settings.themeEyebrow': 'ESTILO',
  'settings.themeDescription': 'La estructura no cambia. La sensación es tuya.',
  'settings.notificationsEyebrow': 'NOTIFICACIONES',
  'settings.securityEyebrow': 'SEGURIDAD',
  'settings.devicesLink': 'Administrar dispositivos activos →',
  'login.heading': 'Ingresa tu email.',
  'login.subtitle': 'Te enviaremos un código de seis dígitos. Sin contraseña.',
  'login.emailLabel': 'DIRECCIÓN DE EMAIL',
  'login.submit': 'Enviar código de acceso →',
  'login.sending': 'Enviando…',
  'login.error': 'No pudimos enviar el código. Confirma tu email de inscripción.',
  'verify.heading': 'Ingresa tu código.',
  'verify.subtitle': 'Código enviado a {email} · expira pronto · un solo uso.',
  'verify.codeLabel': 'CÓDIGO DE SEIS DÍGITOS',
  'verify.submit': 'Continuar →',
  'verify.verifying': 'Verificando…',
  'verify.error': 'Código inválido o expirado. Pide uno nuevo.',
  'verify.resend': 'Reenviar código',
  'verify.invalidCode': 'Ingresa el código de seis dígitos.',
  'verify.sentNew': 'Se envió un código nuevo.',
  'verify.resendFailed': 'No se pudo reenviar ahora. Espera un momento.',
  'verify.codeInputAria': 'Código de verificación de seis dígitos'
}

const table: CopyTable = { en, es }

// Resolve a copy string. `{name}` placeholders are replaced with the
// value from `vars`. Missing placeholders are left as-is. Missing
// keys fall back to the key itself (so the missing copy is obvious in
// the rendered UI).
export function t(key: CopyKey, locale: Locale = 'en', vars: Record<string, string | number> = {}): string {
  const raw = table[locale]?.[key] ?? key
  return raw.replace(/\{(\w+)\}/g, (_, name) => {
    return name in vars ? String(vars[name]) : `{${name}}`
  })
}

export const supportedLocales: Locale[] = ['en', 'es']
export const defaultLocale: Locale = 'en'

// Resolve the locale from a request. Phase 9: prefers the
// cookie; falls back to the Accept-Language header; defaults
// to English. Future: BCP-47 negotiation per-route.
export function resolveLocale(opts: { cookie?: string; acceptLanguage?: string } = {}): Locale {
  if (opts.cookie === 'es' || opts.cookie === 'en') return opts.cookie
  if (opts.acceptLanguage) {
    const al = opts.acceptLanguage.toLowerCase()
    if (al.includes('es')) return 'es'
  }
  return 'en'
}
