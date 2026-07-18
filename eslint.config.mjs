// Flat ESLint config. Next 16 deprecated next lint in favor of running
// eslint directly, so we ship a flat config that uses the official
// `eslint-config-next` preset (which is what next lint used internally).
import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({ baseDirectory: import.meta.dirname })

export default [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'coverage/**',
      'public/**',
      'supabase/functions/**',
      'prototypes/**',
      'next-env.d.ts'
    ]
  },
  ...compat.extends('next/core-web-vitals'),
  {
    rules: {
      // We have many single-letter / short names in this codebase on
      // purpose (e.g. `b` for block, `p` for profile). Don't punish that.
      '@typescript-eslint/no-explicit-any': 'off',
      // Allow non-null assertions where the type system can't narrow
      // through .find(...) returns. We use ! sparingly.
      '@typescript-eslint/no-non-null-assertion': 'off',
      // React/Next: prevent obvious mistakes.
      'react/no-unescaped-entities': 'off',
      '@next/next/no-img-element': 'warn'
    }
  }
]
