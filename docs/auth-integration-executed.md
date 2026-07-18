# Auth Integration Executed

The public login flow now uses Supabase Auth directly:

- `/login` calls `signInWithOtp` with `shouldCreateUser: false`.
- The email is normalized and stored only temporarily in session storage for the verify step.
- `/verify` calls `verifyOtp` with `type: 'email'`.
- Successful verification redirects to `/dashboard`.
- Invalid/expired codes show a safe generic error.
- Users can resend a code.
- Inputs include email and one-time-code autocomplete semantics.
- No magic-link flow is used.

## Required Supabase configuration

- Email OTP provider enabled.
- Magic Link/OTP email template uses `{{ .Token }}`.
- OTP expiration configured to the cohort policy.
- `shouldCreateUser: false` remains mandatory.
- Production enrollment eligibility should be enforced before OTP issuance with the Edge Function gate, not only by the client.
