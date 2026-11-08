import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The shared workspace package is consumed as TypeScript source
  transpilePackages: ['@jobdash/shared'],
  experimental: {
    // Do not query the npm registry for upgrade nudges (the app should not talk to external hosts)
    agentUpgrade: false,
  },
};

export default nextConfig;
