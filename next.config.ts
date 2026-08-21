import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module: it has to be required at runtime rather
  // than bundled, or the .node binary won't resolve.
  serverExternalPackages: ["better-sqlite3"],

  // Pin the workspace root: there is a stray lockfile in the home directory,
  // and without this Next.js walks up, finds it, and watches that whole tree.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
