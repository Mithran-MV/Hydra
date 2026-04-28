import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["three"],
  experimental: {
    optimizePackageImports: ["lucide-react", "@react-three/drei"],
  },
  async redirects() {
    return [
      // The verification page was renamed from /evidence to /chronicle
      // on 2026-04-29. Permanent redirect so any external link previously
      // shared (sponsor email, judge bookmark, social post) keeps working.
      { source: "/evidence", destination: "/chronicle", permanent: true },
    ];
  },
};

export default nextConfig;
