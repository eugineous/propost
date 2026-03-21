/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      "upload.wikimedia.org",
      "commons.wikimedia.org",
      "ppptv-v2.vercel.app",
      "ichef.bbci.co.uk",
      "www.standardmedia.co.ke",
      "variety.com",
      "deadline.com",
    ],
  },
  // serverActions is on by default in Next.js 14 — no config needed
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent axios/undici from being bundled by webpack on the server
      // (they work fine as external Node.js modules)
      config.externals = [...(config.externals || []), "axios"];
    }
    return config;
  },
};

module.exports = nextConfig;
