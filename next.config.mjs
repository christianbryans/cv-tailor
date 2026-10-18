/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ['mammoth'],
  eslint: { ignoreDuringBuilds: true },
};
export default nextConfig;
