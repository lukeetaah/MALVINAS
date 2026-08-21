import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@malvinas/simulation", "@malvinas/narrative"],
};

export default nextConfig;
