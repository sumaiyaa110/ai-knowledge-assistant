import type { NextConfig } from "next";

const maxUploadMb = Number(process.env.MAX_UPLOAD_MB ?? 20);

const nextConfig: NextConfig = {
  // Native modules that must be loaded from node_modules, not bundled.
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node", "sharp"],
  // Baseline hardening for every response.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "same-origin" },
        ],
      },
    ];
  },
  experimental: {
    // Requests that pass through middleware are buffered and cut off at 10 MB
    // by default, which would truncate uploads. Allow the upload limit plus
    // headroom for the multipart envelope.
    middlewareClientMaxBodySize: `${maxUploadMb + 2}mb`,
  },
};

export default nextConfig;
