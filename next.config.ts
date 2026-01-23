import type { NextConfig } from "next";
// @ts-expect-error - no types available for this specific package version yet or resolution issue
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: false, // Enable PWA in dev for testing Push capabilities
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withPWA(nextConfig);
