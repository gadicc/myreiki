/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { swcPlugins: [["@lingui/swc-plugin", {}]] },
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: ["@serwist/next"],
  turbopack: {
    rules: {
      "*.svg": {
        condition: { not: { query: /[?&]url(?:&|$)/ } },
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
};

export default nextConfig;
