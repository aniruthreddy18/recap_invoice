import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: there is a stray lockfile in the home directory,
  // and without this Next.js walks up, finds it, and watches that whole tree.
  // process.cwd() rather than __dirname — the config is loaded as ESM on
  // Vercel, where __dirname doesn't exist.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
