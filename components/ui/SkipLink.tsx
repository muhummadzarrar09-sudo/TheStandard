'use client'

// Skip link. Hidden until focused; the first thing keyboard users
// encounter. PRD 18.10 accessibility QA: keyboard-only navigation
// works on every page.
export default function SkipLink() {
  return (
    <a
      href="#main"
      style={{
        position: 'absolute',
        left: -9999,
        top: 8,
        padding: '10px 14px',
        background: 'var(--accent)',
        color: '#10140c',
        fontWeight: 700,
        zIndex: 1000
      }}
      onFocus={(e) => {
        // Bring into view when focused.
        const el = e.currentTarget
        el.style.left = '8px'
      }}
      onBlur={(e) => {
        e.currentTarget.style.left = '-9999px'
      }}
    >
      Skip to content
    </a>
  )
}
