import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The shared workspace package is consumed as TypeScript source
  transpilePackages: ['@jobdash/shared'],
  // Temporary until the dashboard exists at "/": redirect without rendering a page
  // (a page calling redirect() during render crashes the dev-mode performance tracks).
  async redirects() {
    return [{ source: '/', destination: '/companies', permanent: false }];
  },
};

export default nextConfig;
