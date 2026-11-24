import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  // Dev only: allow opening the dev server from a phone on the local network.
  allowedDevOrigins: ["192.168.*.*"],
};

export default nextConfig;
