import type { NextConfig } from "next";

const config: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  devIndicators: false,
  webpack(config, { dev }) {
    if (!dev) config.cache = false;
    return config;
  },
};

export default config;
