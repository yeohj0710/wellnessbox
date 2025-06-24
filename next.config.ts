import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push("onnxruntime-node");
    }

    config.module.rules.push({
      test: /\.node$/,
      use: {
        loader: "node-loader",
      },
    });

    return config;
  },
};

export default nextConfig;
