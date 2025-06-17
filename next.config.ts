
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
  },
  // Ensure Next.js looks for the app directory in 'frontend/app'
  // This line assumes you want 'frontend' to act like 'src' for the appDir.
  // If your pages/api routes are directly in 'frontend/app' and 'frontend/api' etc. this is not needed.
  // If your app pages are in `frontend/app`, Next.js default behavior (appDir: true)
  // will look for `./app` or `./src/app`.
  // To use `frontend/app`, we need to ensure Next.js knows.
  // However, if `frontend` is just a regular folder and `app` is still at root or `src/app`,
  // this reconfig is different.
  // Given the tsconfig paths `@/app/*`: ["frontend/app/*"], it seems `frontend/app` is the new app dir.
  // Next.js typically finds `app` or `src/app`. To use `frontend/app`, you'd typically need to tell Next.js.
  // But since we're moving files *into* `frontend/app` which will be the *new* app dir,
  // we will rely on Next.js finding `./app` (once old `app` is deleted and `frontend/app` is renamed to `app` OR if `next.config.js` could specify `appDir: 'frontend'` which is not standard).
  // For now, the `content` path for Tailwind is the most direct change.
  // The true "app router" directory will be `frontend/app`.
  // We will assume that after this refactor, you might rename `frontend/app` to `app` at the root,
  // or Next.js will be configured to find it in `frontend/app` (which is not standard via next.config.ts directly without `srcDir`).
  // For now, let's ensure Tailwind scans the right new places.
  // The alias `@/app/*` in tsconfig pointing to `frontend/app/*` helps with imports.
  webpack: (config, { isServer }) => {
    // Required for pdfjs-dist
    if (!isServer) {
      config.resolve.alias['pdfjs-dist/build/pdf.worker.entry.js'] = 
        'pdfjs-dist/build/pdf.worker.min.js';
    }
    return config;
  },
  // Update Tailwind content paths
  // Assuming `frontend/` will contain all relevant UI code including `frontend/app/`
  // and the old root `app/` and `src/` are being phased out.
  // tailwind.config.ts `content` array will be updated.
  // Here, we just need to be sure Next.js itself doesn't break.
};

export default nextConfig;
