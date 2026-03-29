/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@neondatabase/serverless', 'playwright'],
  experimental: {
    serverComponentsExternalPackages: ['@neondatabase/serverless'],
  },
}

module.exports = nextConfig
