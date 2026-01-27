/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimizaciones de producción
  poweredByHeader: false,
  
  // Comprimir respuestas
  compress: true,
  
  // Optimización de builds
  swcMinify: true,
  
  // Configuración de imágenes optimizadas
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 días
  },
  
  // Experimental features para mejor rendimiento
  experimental: {
    optimizeCss: true,
  },
  
  // Headers de seguridad y caché
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
      // Caché para assets estáticos
      {
        source: '/(.*)\\.(js|css|woff|woff2|ttf|eot|ico|svg|png|jpg|jpeg|gif|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Caché para API routes
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
