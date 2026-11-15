// @vitest-environment node
import { describe, expect, it } from 'vitest'
import nextConfig from './next.config'

// SEC-06, PROJ-1 BUG-5: every response carries the security headers.
describe('next.config security headers', () => {
  it('sends the headers on every path and hides the framework', async () => {
    const regeln = (await nextConfig.headers?.()) ?? []
    const fuerAlle = regeln.find((regel) => regel.source === '/:path*')
    const header = Object.fromEntries((fuerAlle?.headers ?? []).map(({ key, value }) => [key, value]))

    expect(header['X-Frame-Options']).toBe('DENY')
    expect(header['Content-Security-Policy']).toContain("frame-ancestors 'none'")
    expect(header['X-Content-Type-Options']).toBe('nosniff')
    expect(header['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(header['Strict-Transport-Security']).toMatch(/^max-age=\d{8,}/)
    expect(nextConfig.poweredByHeader).toBe(false)
  })
})
