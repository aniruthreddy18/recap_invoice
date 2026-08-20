import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the workspace root: there is a stray lockfile in the home directory,
  // and without this Next.js walks up, finds it, and watches that whole tree.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
