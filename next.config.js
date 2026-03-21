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
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;
