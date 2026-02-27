import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "content.airhex.com",
      },
    ],
  },
};

export default nextConfig;
