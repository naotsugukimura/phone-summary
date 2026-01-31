import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ここに設定を追加します
  webpack: (config) => {
    config.devtool = 'source-map';
    return config;
  },
};

export default nextConfig;