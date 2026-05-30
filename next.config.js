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
}

module.exports = nextConfig
