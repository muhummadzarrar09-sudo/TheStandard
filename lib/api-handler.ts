// Next.js handler wrappers. These build on the framework-agnostic helpers
// in lib/api-errors.ts. Kept in a separate file so the underlying
// helpers can be unit-tested without a next/server import.

import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import {
  ApiError,
  ApiResponse,
  buildBody,
  serverError,
  toResponse
} from './api-errors'
import { getRequestId, resolveRequestId } from './request-context'
import { log } from './log'

// Convert an ApiResponse to a NextResponse. Prefer this from Next.js
// route handlers.
export function toNextResponse(r: ApiResponse): NextResponse {
  return NextResponse.json(r.body, { status: r.status })
}

// Attach a request_id to an outgoing Response.
export function withRequestId(response: Response, requestId: string): Response {
  try {
    const headers = new Headers(response.headers)
    headers.set('x-request-id', requestId)
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    })
  } catch {
    return response
  }
}

// Wrap a route handler so every response carries an x-request-id
// header. Pair this with withErrorHandling for full error coverage.
export function withRequestIdHeader<T extends (...args: any[]) => Promise<Response>>(handler: T): T {
  return (async (...args: any[]) => {
    const req = args[0] as NextRequest | undefined
    const requestId = req ? resolveRequestId(req) : 'no-request'
    const response = await handler(...args)
    return withRequestId(response, requestId)
  }) as T
}

// Wrap a route handler to emit an access log line for every request.
// The line includes method, path, status, and duration. Useful when
// you want Vercel's log dashboard to show per-route traffic.
export function withAccessLog<T extends (...args: any[]) => Promise<Response>>(handler: T): T {
  return (async (...args: any[]) => {
    const req = args[0] as NextRequest | undefined
    const start = Date.now()
    let response: Response
    try {
      response = await handler(...args)
    } catch (err) {
      log.error({
        request_id: req ? getRequestId(req) : 'no-request',
        method: req?.method,
        path: req?.nextUrl?.pathname,
        duration_ms: Date.now() - start,
        err: err instanceof Error ? err.message : String(err)
      }, 'request failed before response')
      throw err
    }
    log.info({
      request_id: req ? getRequestId(req) : 'no-request',
      method: req?.method,
      path: req?.nextUrl?.pathname,
      status: response.status,
      duration_ms: Date.now() - start
    }, 'request')
    return response
  }) as T
}

// Wraps a route handler so any thrown ApiError becomes a typed JSON
// response, any other thrown error becomes a generic 500 (no leak),
// and Zod validation errors become 400s with field details. The
// `requireServerAdmin` helper throws an ApiResponse which is also
// caught here.
//
// Every response carries an `x-request-id` header (or echoes the
// client's) so an ops engineer can correlate a client-side error
// with server logs.
export function withErrorHandling<T extends (...args: any[]) => Promise<Response>>(handler: T): T {
  return (async (...args: any[]) => {
    const req = args[0] as NextRequest | undefined
    const requestId = req ? getRequestId(req) : 'no-request'
    let response: Response
    try {
      response = await handler(...args)
    } catch (err) {
      if (err && typeof err === 'object' && 'status' in err && 'body' in err) {
        // ApiResponse (thrown by requireServerAdmin etc)
        const api = err as ApiResponse
        log.warn({ request_id: requestId, status: api.status, error: api.body.error, field: api.body.field }, 'api error response')
        response = toResponse(api)
      } else if (err instanceof ApiError) {
        log.warn({ request_id: requestId, status: err.status, error: err.message, field: err.field }, 'api error response')
        response = toResponse({
          status: err.status,
          body: buildBody(err.message, { field: err.field, details: err.details })
        })
      } else if (err instanceof ZodError) {
        log.warn({ request_id: requestId, status: 400, details: err.flatten() }, 'zod validation failed')
        response = toResponse({
          status: 400,
          body: { error: 'Validation failed', details: err.flatten() }
        })
      } else {
        log.error({ request_id: requestId, err: err instanceof Error ? { message: err.message, stack: err.stack } : String(err) }, 'unhandled api error')
        response = toResponse(serverError())
      }
    }
    // Attach the request_id to the response so the client can reference it.
    try {
      const headers = new Headers(response.headers)
      headers.set('x-request-id', requestId)
      response = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      })
    } catch {
      // If we can't clone, leave the original response alone.
    }
    return response
  }) as T
}
