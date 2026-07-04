// When BUILD_TARGET=desktop we emit a fully static export (out/) that the
// Electron shell serves locally. The default web build (dev / next start /
// e2e) is unaffected.
const desktop = process.env.BUILD_TARGET === "desktop";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(desktop ? { output: "export", images: { unoptimized: true } } : {}),
};

export default nextConfig;
