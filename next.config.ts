import type { NextConfig } from "next";

// Nothing to configure: the app is plain Next.js App Router with a Postgres
// driver that needs no bundler help. Anything added here has to earn its place,
// because a stale entry (a package that is no longer installed, a pinned root
// that doesn't exist on the build machine) breaks the deployment quietly.
const nextConfig: NextConfig = {};

export default nextConfig;
