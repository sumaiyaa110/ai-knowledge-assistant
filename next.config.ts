import type { NextConfig } from "next";

const maxUploadMb = Number(process.env.MAX_UPLOAD_MB ?? 20);

const nextConfig: NextConfig = {
  // Native modules that must be loaded from node_modules, not bundled.
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node", "sharp"],
  experimental: {
    // Requests that pass through middleware are buffered and cut off at 10 MB
    // by default, which would truncate uploads. Allow the upload limit plus
    // headroom for the multipart envelope.
    middlewareClientMaxBodySize: `${maxUploadMb + 2}mb`,
  },
};

export default nextConfig;
