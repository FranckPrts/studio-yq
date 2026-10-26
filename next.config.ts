import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `forbidden()` lets the project gate tell a member their role is too low,
  // instead of answering 404 as it does for strangers.
  experimental: {
    authInterrupts: true,
  },
};

export default nextConfig;
