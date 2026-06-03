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
        ],
      },
    ]
  },
}

module.exports = nextConfig
