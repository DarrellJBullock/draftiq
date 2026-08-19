import type { NextConfig } from "next";

// No .env file ships with this repo (see README/env.example). These are
// non-secret local-dev fallbacks -- a trust-auth local Postgres connection
// string with no password, nothing sensitive -- so `npm run dev` works
// immediately after `npm install`. Any real .env/.env.local you create
// takes precedence since we only fill in what's missing.
process.env.DATABASE_URL ??= "postgresql://darrellbullock@localhost:5432/draftiq";
process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";
process.env.NEXT_PUBLIC_DEFAULT_SEASON ??= "2026";
process.env.DEMO_AUTH_SECRET ??= "insecure-dev-secret-change-me";
process.env.AI_PROVIDER ??= "fallback";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
