import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1 MB — workbook rows serialised as POST body can exceed this
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
