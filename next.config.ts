
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
      { // Adding GitHub to allow user profile images from NextAuth.js if they use GitHub for login
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
      { // Adding Google to allow user profile images from NextAuth.js if they use Google for login
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
  }
};

export default nextConfig;
