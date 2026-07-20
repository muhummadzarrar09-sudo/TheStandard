// CSP nonce helper. A nonce is a per-request random string that
// allows inline <script> tags to run without a permissive
// 'unsafe-inline' policy. The middleware generates a fresh nonce on
// every request and writes it to the x-nonce header; any server
// component can read it via next/headers and stamp it on a script tag.
// The same nonce is then injected into the CSP by next.config.ts.
//
// We do not generate a different nonce per inline <style>: the styles
// shipped by the app are all in globals.css and external stylesheets,
// so we keep 'unsafe-inline' for style-src only. Script-src becomes
// 'self' + 'nonce-...', which is the actual security win.

import { headers as nextHeaders } from 'next/headers'

// Use Web Crypto on edge (and everywhere else — it's available in
// Node 18+ via globalThis.crypto). The previous implementation
// imported randomBytes from the Node 'crypto' module, which is not
// available in the Edge Runtime that Next.js middleware runs under.
function randomBytesEdge(len: number): Uint8Array {
  const out = new Uint8Array(len)
  globalThis.crypto.getRandomValues(out)
  return out
}

export const CSP_NONCE_HEADER = 'x-csp-nonce'

// Generate a base64url nonce. 16 random bytes = ~22 base64url chars.
export function generateNonce(): string {
  // btoa() is available in both the Edge Runtime and Node 18+, so
  // we don't need the Node 'crypto' module. Convert bytes → latin1
  // string → base64 → base64url.
  const bytes = randomBytesEdge(16)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Read the nonce for the current request. Returns null if the
// middleware didn't set one (which means we're rendering outside a
// request, e.g. in a test or a static export). Callers should fall
// back to omitting the nonce attribute on the script tag in that
// case; the CSP will then block the inline script, which is the
// safer failure mode.
export async function getCspNonce(): Promise<string | null> {
  try {
    // next/headers in Next 15+ returns a Promise<ReadonlyHeaders>;
    // .get() lives on the awaited value.
    const h = await nextHeaders()
    return h.get(CSP_NONCE_HEADER)
  } catch {
    return null
  }
}
