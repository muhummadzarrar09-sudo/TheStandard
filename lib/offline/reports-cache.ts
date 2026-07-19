// The constants for the reports offline cache. Both the service
// worker (public/sw.js) and the client-side SaveOfflineButton
// component import from here so the cache name and the per-user
// limit are kept in sync. (The service worker cannot import this
// file directly because it runs in a different global scope, so
// the values below are also mirrored in public/sw.js. If you
// change one, change the other.)

export const REPORT_CACHE_NAME = 'discipline-reports-v2'

// PRD §7.6: "Offline cache of the latest configurable number;
// default 5 reports." The SW trims the cache down to this size on
// every successful put.
export const DEFAULT_REPORT_OFFLINE_LIMIT = 5
