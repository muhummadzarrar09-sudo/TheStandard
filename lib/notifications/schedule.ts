export type NotificationPreference={daily_reminder:boolean;report_alerts:boolean;team_messages:boolean;quiet_start?:string|null;quiet_end?:string|null}
export function withinQuietHours(localTime:string,p:NotificationPreference){if(!p.quiet_start||!p.quiet_end)return false;const t=localTime.slice(0,5);return p.quiet_start<=p.quiet_end?t>=p.quiet_start&&t<p.quiet_end:t>=p.quiet_start||t<p.quiet_end}
export function shouldSend(category:'daily_reminder'|'report_alerts'|'team_messages',localTime:string,p:NotificationPreference){if(withinQuietHours(localTime,p))return false;return p[category]}
