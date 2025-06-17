
// import type {NextConfig} from 'next'; // Rimosso per evitare potenziali conflitti di tipo con versioni canary

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      { 
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
      { 
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  experimental: { 
    serverActions: {
      bodySizeLimit: '10mb', 
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias['pdfjs-dist/build/pdf.worker.entry.js'] = 
        'pdfjs-dist/build/pdf.worker.min.js';
    }
    return config;
  },
};

export default nextConfig;
