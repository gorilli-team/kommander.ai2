// import type {NextConfig} from 'next'; // Rimosso per evitare potenziali conflitti di tipo con versioni canary

const nextConfig = {
  /* config options here */
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
  serverActions: {
    bodySizeLimit: '10mb', // Aumentato il limite di dimensione del corpo per le Server Actions
  },
};

export default nextConfig;
