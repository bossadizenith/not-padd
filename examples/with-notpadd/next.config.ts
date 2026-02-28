import { withNotpadd } from "notpadd";
import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
};

// @ts-expect-error type mismatch between Next.js 14 and 16
export default withNotpadd(nextConfig);
