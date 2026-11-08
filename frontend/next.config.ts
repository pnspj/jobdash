import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The shared workspace package is consumed as TypeScript source
  transpilePackages: ['@jobdash/shared'],
};

export default nextConfig;
