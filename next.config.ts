
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
    ],
  },
  experimental: { // Spostato serverActions qui
    serverActions: {
      bodySizeLimit: '10mb', 
    },
  }
};

export default nextConfig;
