import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  transpilePackages: ["@us100/contracts", "@us100/design-system", "@us100/research"]
};

export default nextConfig;

