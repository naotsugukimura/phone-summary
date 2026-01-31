import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config) => {
    config.devtool = 'source-map';
    return config; // ← これがないと動きません
  },
};

export default nextConfig;