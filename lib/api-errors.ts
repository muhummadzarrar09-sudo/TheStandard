// API error helpers. Every route in app/api/ should use these so the
// responses are consistent and Postgres error messages never leak to
// clients. The helpers return a typed { status, body } pair so they're
// usable from tests and from any web framework. Route handlers wrap the
// pair in a Response via toResponse.

export type ApiErrorBody = {
  error: string
  details?: unknown
  field?: string
}

export type ApiResponse = {
  status: number
  body: ApiErrorBody
}

export class ApiError extends Error {
  status: number
  details?: unknown
  field?: string
  constructor(
    message: string,
    status = 500,
    options: { details?: unknown; field?: string; cause?: unknown } = {}
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = options.details
    this.field = options.field
    if (options.cause !== undefined) (this as unknown as { cause?: unknown }).cause = options.cause
  }
}

export function buildBody(message: string, options: { field?: string; details?: unknown }): ApiErrorBody {
  const body: ApiErrorBody = { error: message }
  if (options.field !== undefined) body.field = options.field
  if (options.details !== undefined) body.details = options.details
  return body
}

export function badRequest(message: string, options: { details?: unknown; field?: string } = {}): ApiResponse {
  return { status: 400, body: buildBody(message, options) }
}

export function unauthorized(message = 'Unauthorized'): ApiResponse {
  return { status: 401, body: { error: message } }
}

export function forbidden(message = 'Forbidden'): ApiResponse {
  return { status: 403, body: { error: message } }
}

export function notFound(message = 'Not found'): ApiResponse {
  return { status: 404, body: { error: message } }
}

export function conflict(message: string, options: { details?: unknown; field?: string } = {}): ApiResponse {
  return { status: 409, body: buildBody(message, options) }
}

export function serverError(message = 'Internal error'): ApiResponse {
  return { status: 500, body: { error: message } }
}

// Convert an ApiResponse to a Web Response. Use this from route handlers.
export function toResponse(r: ApiResponse, init?: ResponseInit): Response {
  return new Response(JSON.stringify(r.body), {
    status: r.status,
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers || {}) }
  })
}

// Postgrest error code → typed response. Useful for upserts and selects
// that throw PostgrestError on constraint violations, FK errors, etc. We
// never want to surface the raw `message` to the client.
const POSTGREST_CLIENT_CODES = new Set<string>([
  '23505', // unique_violation
  '23503', // foreign_key_violation
  '23502', // not_null_violation
  '23514', // check_violation
  '22P02', // invalid_text_representation
  '22023'  // invalid_parameter_value
])

export function postgrestErrorResponse(
  err: { code?: string; message?: string },
  fallback: string
): ApiResponse {
  if (err.code && POSTGREST_CLIENT_CODES.has(err.code)) {
    return conflict(fallback, { details: { code: err.code } })
  }
  console.error('[api] Postgrest error:', err)
  return serverError()
}
