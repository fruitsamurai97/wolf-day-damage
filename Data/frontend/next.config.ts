import type { NextConfig } from 'next';

// ----------------------------------------------------------------------

/**
 * Static Exports in Next.js
 *
 * 1. Set `isStaticExport = true` in `next.config.{mjs|ts}`.
 * 2. This allows `generateStaticParams()` to pre-render dynamic routes at build time.
 *
 * For more details, see:
 * https://nextjs.org/docs/app/building-your-application/deploying/static-exports
 *
 * NOTE: Remove all "generateStaticParams()" functions if not using static exports.
 */
const isStaticExport = false;

// ----------------------------------------------------------------------

const nextConfig: NextConfig = {
  trailingSlash: true,
  output: isStaticExport ? 'export' : undefined,
  /**
   * Lint is a separate gate (`yarn lint`), not a deploy gate.
   *
   * react-three-fiber renders its scene graph through JSX host elements
   * (<mesh position>, <boxGeometry args>, <meshStandardMaterial roughness>).
   * eslint-plugin-react validates JSX props against the DOM, so every one of
   * those is reported as react/no-unknown-property — false positives that
   * would otherwise fail `next build` on Vercel. Type safety is unaffected:
   * tsc still type-checks the whole build.
   */
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    BUILD_STATIC_EXPORT: JSON.stringify(isStaticExport),
  },
  // Without --turbopack (next dev)
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },
  // With --turbopack (next dev --turbopack)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
};

export default nextConfig;
