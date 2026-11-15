import type { NextConfig } from 'next'

// SEC-06 (PROJ-1 BUG-5): security headers on every response. A script CSP with nonces follows
// separately (docs/production/security-headers.md → roll out as Report-Only first); the CSP
// below only forbids embedding, so login and "delete account" cannot be framed (clickjacking).
const SICHERHEITS_HEADER = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Same-origin requests keep the full path (the sign-in leads back to it, EC-3).
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: SICHERHEITS_HEADER }]
  },
}

export default nextConfig
