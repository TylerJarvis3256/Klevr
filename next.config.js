/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
