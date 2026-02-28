import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "content.airhex.com",
      },
      {
        protocol: "https",
        hostname: "t.plnspttrs.net",
      },
    ],
  },
};

export default nextConfig;
