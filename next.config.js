/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove static export since we're using Firebase Functions
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        path: false,
        stream: false,
        util: false,
        url: false,
        child_process: false,
      };
    }
    return config;
  },
  
  // Disable features that don't work with static export
  experimental: {
    esmExternals: 'loose',
  },
};

module.exports = nextConfig;