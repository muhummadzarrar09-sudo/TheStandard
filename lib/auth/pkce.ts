// PKCE (Proof Key for Code Exchange) utility functions
// Implements RFC 7636 for secure OAuth 2.0 authentication in public clients

import { webcrypto } from 'crypto'

/**
 * Generate a cryptographically random code_verifier
 * Must be 43-128 characters long, using unreserved characters:
 * [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
 * 
 * @returns {string} Random code_verifier string (64 characters)
 */
export function generateCodeVerifier(): string {
  // Generate 48 random bytes (will become 64 base64url characters)
  const randomBytes = new Uint8Array(48)
  webcrypto.getRandomValues(randomBytes)
  
  // Convert to base64url encoding (no padding, URL-safe)
  return base64UrlEncode(randomBytes)
}

/**
 * Generate code_challenge from code_verifier using SHA-256
 * code_challenge = BASE64URL(SHA256(code_verifier))
 * 
 * @param {string} codeVerifier - The code_verifier string
 * @returns {Promise<string>} The code_challenge string
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  // Convert code_verifier to ArrayBuffer
  const encoder = new TextEncoder()
  const data = encoder.encode(codeVerifier)
  
  // Hash with SHA-256
  const hashBuffer = await webcrypto.subtle.digest('SHA-256', data)
  
  // Convert hash to base64url encoding
  return base64UrlEncode(new Uint8Array(hashBuffer))
}

/**
 * Encode a Uint8Array to base64url format
 * Base64url is URL-safe base64 without padding
 * 
 * @param {Uint8Array} buffer - The buffer to encode
 * @returns {string} Base64url encoded string
 */
function base64UrlEncode(buffer: Uint8Array): string {
  // Convert to regular base64
  let base64 = ''
  const bytes = buffer
  const len = bytes.length
  
  for (let i = 0; i < len; i++) {
    base64 += String.fromCharCode(bytes[i])
  }
  
  // Use btoa for base64 encoding
  base64 = btoa(base64)
  
  // Convert to base64url:
  // - Replace + with -
  // - Replace / with _
  // - Remove = padding
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Validate that a code_verifier meets RFC 7636 requirements
 * 
 * @param {string} codeVerifier - The code_verifier to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function isValidCodeVerifier(codeVerifier: string): boolean {
  // Must be 43-128 characters
  if (codeVerifier.length < 43 || codeVerifier.length > 128) {
    return false
  }
  
  // Must only contain unreserved characters: [A-Za-z0-9-._~]
  const validChars = /^[A-Za-z0-9\-._~]+$/
  return validChars.test(codeVerifier)
}

/**
 * Generate PKCE parameters (code_verifier and code_challenge)
 * Convenience function that returns both values
 * 
 * @returns {Promise<{ codeVerifier: string, codeChallenge: string }>}
 */
export async function generatePKCEParams(): Promise<{
  codeVerifier: string
  codeChallenge: string
}> {
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  
  return { codeVerifier, codeChallenge }
}
