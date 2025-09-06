import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  distDir: 'out',
  images: {
    unoptimized: true,
  },
  outputFileTracingRoot: __dirname,
  serverExternalPackages: ['bun'],
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  webpack: (config) => {
    // Exclude mcp-server-bundle directory from webpack processing
    config.module.rules.push({
      test: /mcp-server-bundle.*\.(ts|js)$/,
      use: 'ignore-loader',
    });
    
    // Also exclude the symlinked or copied mcp-server files from src-tauri/target
    config.module.rules.push({
      test: /src-tauri\/target.*mcp-server-bundle.*\.(ts|js)$/,
      use: 'ignore-loader',
    });
    
    return config;
  },
};

export default nextConfig;
