import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "crests.football-data.org",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "goalscore.fun" }],
        destination: "https://devnet.goalscore.fun/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
