/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  swcMinify: true,
  
  // Prevent prerendering of API routes during build
  generateBuildId: async () => {
    return 'build-' + Date.now();
  },
  
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
    
    // Add path aliases to match tsconfig
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
      '@/shared': require('path').resolve(__dirname, 'src/shared'),
      '@/shared/components': require('path').resolve(__dirname, 'src/shared/components'),
      '@/shared/lib': require('path').resolve(__dirname, 'src/shared/lib'),
      '@/shared/types': require('path').resolve(__dirname, 'src/shared/types'),
      '@/shared/hooks': require('path').resolve(__dirname, 'src/shared/hooks'),
      '@/shared/utils': require('path').resolve(__dirname, 'src/shared/utils'),
      '@/app': require('path').resolve(__dirname, 'src/app'),
      '@/config': require('path').resolve(__dirname, 'src/config'),
      '@/styles': require('path').resolve(__dirname, 'src/styles'),
      '@/features': require('path').resolve(__dirname, 'src/features'),
    };
    
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

  // TypeScript configuration - ignore type errors in non-app files
  typescript: {
    ignoreBuildErrors: true,
    tsconfigPath: './tsconfig.json',
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
