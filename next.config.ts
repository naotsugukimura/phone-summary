import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // ここに設定を追加します
  webpack: (config) => {
    config.devtool = 'source-map';
    return config;
  },
};

export default nextConfig;