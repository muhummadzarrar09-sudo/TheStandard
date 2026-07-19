'use client'

import { useEffect } from 'react'
import { installCsrfFetchShim } from '../../lib/csrf-client'

// Mounted at the root. Installs the global fetch shim exactly
// once, before any component code runs. The shim reads the
// `csrf` cookie (set by the middleware on the first safe
// request) and adds the `x-csrf-token` header to every
// state-changing fetch the app makes.
export default function CsrfBootstrap() {
  useEffect(() => {
    installCsrfFetchShim()
  }, [])
  return null
}
