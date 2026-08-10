// Content-Security-Policy in REPORT-ONLY mode: the browser reports violations
// to the devtools console (and to report-uri if added) but blocks NOTHING, so
// it is safe to ship to production. Use the reports to see exactly what needs
// allow-listing, then graduate to an enforcing `Content-Security-Policy` header.
//
// Notes on the allowances below (driven by this app's stack):
//   • script-src 'unsafe-inline'  → Next.js hydration bootstrap is inline. Moving
//     to nonces later lets you drop this. 'unsafe-eval' is kept for now because
//     React Fast Refresh (dev) uses eval; try removing it against a prod build.
//   • style-src 'unsafe-inline'   → the template uses inline style objects +
//     styled-jsx; unavoidable without a big refactor (low risk for styles).
//   • img/media 'https:' blob: data: → Supabase Storage, Unsplash/Picsum, canvas
//     (three.js), and owner-supplied music URLs.
//   • connect-src *.supabase.co + wss → Supabase Auth/REST + Realtime;
//     *.r2.cloudflarestorage.com → the editor's direct-to-R2 media upload PUTs
//     to a presigned S3 URL, which is a fetch() and so hits connect-src, not
//     img-src. Harmless to omit while this header is report-only — and exactly
//     the thing that would silently break every upload once it is enforced.
//   • frame-src 'self' + google.com → the editor PreviewPane embeds
//     /<slug>?preview=1, and the EventDetails section embeds a Google Maps
//     iframe (violations were already showing up in report-only mode).
const cspReportOnly = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' blob: data: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.r2.cloudflarestorage.com",
  "frame-src 'self' https://www.google.com https://maps.google.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'picsum.photos' },
    ],
  },
  // GSAP ships ESM that older bundlers complain about — Next 14 is fine,
  // but transpilePackages keeps GSAP + motion happy in edge cases.
  transpilePackages: ['gsap', 'motion'],

  // Baseline security headers applied to every route.
  // NOTE: X-Frame-Options is SAMEORIGIN (not DENY) on purpose — the editor's
  // PreviewPane embeds /<slug>?preview=1 in a same-origin iframe.
  // A strict Content-Security-Policy is intentionally NOT set here yet: GSAP,
  // three.js and inline styles need careful allow-listing first. Add it in
  // report-only mode before enforcing.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          { key: 'Content-Security-Policy-Report-Only', value: cspReportOnly },
        ],
      },
    ]
  },
}

module.exports = nextConfig
