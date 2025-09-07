// eslint-disable-next-line @typescript-eslint/no-var-requires
// Note: we avoid strict typing here to allow experimental keys.
const nextConfig = {
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    // Ensure RAG markdown under /data is included in the chat function bundle.
    outputFileTracingIncludes: {
      "app/api/chat/route": ["./data/**"],
    },
    // Exclude heavy native deps from the chat function when not needed.
    outputFileTracingExcludes: {
      "app/api/chat/route": [
        "**/onnxruntime-node/**",
        "**/@img/**",
      ],
    },
  },
  webpack(config: any) {
    // No-op for now; reserved for optional externals tuning per route.
    return config;
  },
};

export default nextConfig;
