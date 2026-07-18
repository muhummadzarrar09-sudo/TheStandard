// Next.js handler wrappers. These build on the framework-agnostic helpers
// in lib/api-errors.ts. Kept in a separate file so the underlying
// helpers can be unit-tested without a next/server import.

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import {
  ApiError,
  ApiResponse,
  buildBody,
  serverError,
  toResponse
} from './api-errors'

// Convert an ApiResponse to a NextResponse. Prefer this from Next.js
// route handlers.
export function toNextResponse(r: ApiResponse): NextResponse {
  return NextResponse.json(r.body, { status: r.status })
}

// Wraps a route handler so any thrown ApiError becomes a typed JSON
// response, any other thrown error becomes a generic 500 (no leak),
// and Zod validation errors become 400s with field details. The
// `requireServerAdmin` helper throws an ApiResponse which is also
// caught here.
export function withErrorHandling<T extends (...args: any[]) => Promise<Response>>(handler: T): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args)
    } catch (err) {
      if (err && typeof err === 'object' && 'status' in err && 'body' in err) {
        // ApiResponse (thrown by requireServerAdmin etc)
        return toResponse(err as ApiResponse)
      }
      if (err instanceof ApiError) {
        return toResponse({
          status: err.status,
          body: buildBody(err.message, { field: err.field, details: err.details })
        })
      }
      if (err instanceof ZodError) {
        return toResponse({
          status: 400,
          body: { error: 'Validation failed', details: err.flatten() }
        })
      }
      console.error('[api] Unhandled error:', err)
      return toResponse(serverError())
    }
  }) as T
}
