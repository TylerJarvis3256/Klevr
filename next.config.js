/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.auth0.com https://*.supabase.co https://*.s3.amazonaws.com; frame-ancestors 'none';",
          },
        ],
      },
    ]
  },
  webpack: (config, { isServer }) => {
    // Fix for @react-pdf/renderer
    if (isServer) {
      config.externals = [...(config.externals || []), 'canvas']
    }

    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    }

    return config
  },
}

module.exports = nextConfig
