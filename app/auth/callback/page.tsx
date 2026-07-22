'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/browser'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(true)

  useEffect(() => {
    async function handleCallback() {
      try {
        const supabase = createSupabaseBrowser()
        
        // Check if we have a code in query params (PKCE flow)
        const code = searchParams.get('code')
        
        if (code) {
          // PKCE flow: exchange code for session
          console.log('[Auth Callback] PKCE flow detected, exchanging code...')
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          
          if (exchangeError) {
            console.error('[Auth Callback] Code exchange failed:', exchangeError)
            setError('Failed to complete sign-in. Please try again.')
            setProcessing(false)
            return
          }
          
          console.log('[Auth Callback] Session established via PKCE')
        } else {
          // Implicit flow: tokens are in the hash fragment
          // The Supabase browser client should automatically parse these
          console.log('[Auth Callback] Implicit flow detected, waiting for session...')
          
          // Give the Supabase client a moment to parse the hash fragment
          await new Promise(resolve => setTimeout(resolve, 100))
          
          // Try to get the session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          
          if (sessionError) {
            console.error('[Auth Callback] Session error:', sessionError)
            setError('Failed to retrieve session. Please try again.')
            setProcessing(false)
            return
          }
          
          if (!session) {
            // If no session yet, listen for auth state changes
            console.log('[Auth Callback] No session yet, listening for auth state changes...')
            
            const { data: { subscription } } = supabase.auth.onAuthStateChange(
              async (event, session) => {
                if (event === 'SIGNED_IN' && session) {
                  console.log('[Auth Callback] Auth state changed to SIGNED_IN')
                  subscription.unsubscribe()
                  await completeSignIn(session.access_token, session.refresh_token)
                }
              }
            )
            
            // Timeout after 5 seconds
            setTimeout(() => {
              subscription.unsubscribe()
              if (processing) {
                setError('Sign-in timed out. Please try again.')
                setProcessing(false)
              }
            }, 5000)
            
            return
          }
          
          console.log('[Auth Callback] Session found, completing sign-in...')
          await completeSignIn(session.access_token, session.refresh_token)
        }
        
      } catch (err) {
        console.error('[Auth Callback] Unexpected error:', err)
        setError('An unexpected error occurred. Please try again.')
        setProcessing(false)
      }
    }
    
    async function completeSignIn(accessToken: string, refreshToken: string) {
      try {
        // Send tokens to server to set HTTP-only cookies
        const response = await fetch('/api/auth/complete-magic-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: accessToken,
            refresh_token: refreshToken
          })
        })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error('[Auth Callback] Failed to set server cookies:', errorData)
          setError('Failed to complete sign-in. Please try again.')
          setProcessing(false)
          return
        }
        
        console.log('[Auth Callback] Server cookies set successfully')
        
        // Clean up sessionStorage
        sessionStorage.removeItem('discipline-login-email')
        sessionStorage.removeItem('discipline-login-token')
        sessionStorage.removeItem('discipline-login-token-at')
        
        // Redirect to dashboard
        console.log('[Auth Callback] Redirecting to dashboard...')
        router.replace('/dashboard')
        
      } catch (err) {
        console.error('[Auth Callback] Error completing sign-in:', err)
        setError('Failed to complete sign-in. Please try again.')
        setProcessing(false)
      }
    }
    
    handleCallback()
  }, [router, searchParams, processing])

  if (processing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Completing sign-in...</h2>
          <p className="text-muted-foreground">Please wait while we verify your session.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-4">
          <div className="inline-block p-4 rounded-full bg-destructive/10 mb-4">
            <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Sign-in failed</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return null
}
