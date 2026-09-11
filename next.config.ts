import type { NextConfig } from 'next';

const nextConfig: NextConfig =
  process.env.PIVOT_BUILD_TARGET === 'sites'
    ? {}
    : {
        turbopack: {
          root: process.cwd(),
          resolveAlias: {
            'cloudflare:workers': './lib/cloudflare-workers-vercel.ts',
          },
        },
      };

export default nextConfig;
