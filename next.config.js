/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  swcMinify: true,
  
  // Performance optimizations
  compiler: {
    // Keep console logs in production for webhook debugging
    removeConsole: false,
  },
  
  // Image optimization - US-25: Images scale properly with device size
  images: {
    domains: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
  
  // Experimental features - US-25: Performance optimization for mobile networks
  experimental: {
    optimizePackageImports: ['@chakra-ui/react', 'date-fns', 'react-icons'],
    optimizeCss: true,
  },
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    
    // Code splitting optimization - US-25: Minimal payload for mobile
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk for node_modules
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Common chunk for shared code
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
            // Chakra UI separate chunk
            chakra: {
              name: 'chakra',
              test: /[\\/]node_modules[\\/]@chakra-ui[\\/]/,
              chunks: 'all',
              priority: 30,
            },
          },
        },
      };
    }
    
    return config;
  },
  
  // ESLint configuration
  eslint: {
    dirs: ['app', 'components', 'lib'],
    ignoreDuringBuilds: false,
  },
  
  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        // Cache static assets - US-25: Performance optimization
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // Compression - US-25: Minimal payload for mobile networks
  compress: true,
  
  // Generate ETags for better caching
  generateEtags: true,
  
  // Power by header removal for security
  poweredByHeader: false,
};

module.exports = nextConfig;
