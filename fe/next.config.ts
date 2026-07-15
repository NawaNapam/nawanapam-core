import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
  },
  eslint: {
    dirs: ["src", "pages", "components", "lib", "app"],
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["@prisma/client"],
  },
  serverExternalPackages: ["jsdom", "canvas", "isomorphic-dompurify"],
  compress: true,
  poweredByHeader: false,

  //----------------------------------------------------------------------
  // SUBDOMAIN ADMIN HANDLING
  //----------------------------------------------------------------------
  async rewrites() {
    return [
      {
        source: "/",
        has: [
          {
            type: "host",
            value: "admin.nawanapam.com",
          },
        ],
        destination: "/console",
      },
    ];
  },

  //----------------------------------------------------------------------
  // BLOCK ACCESS TO OLD PATH OR REDIRECT
  //----------------------------------------------------------------------
  async redirects() {
    return [
      // Block /console on main domains
      {
        source: "/console/:path*",
        has: [{ type: "host", value: "nawanapam.com" }],
        destination: "/404",
        permanent: false,
      },
      {
        source: "/console/:path*",
        has: [{ type: "host", value: "www.nawanapam.com" }],
        destination: "/404",
        permanent: false,
      },
    ];
  },

  //----------------------------------------------------------------------
  // SECURITY HEADERS (kept from your config)
  //----------------------------------------------------------------------
  async headers() {
    // Skip in dev: `upgrade-insecure-requests` + HSTS force https for every
    // subresource, which breaks Capacitor live-reload served over plain
    // http://<lan-ip>:3000 (CSS/JS silently fail to load).
    if (process.env.NODE_ENV !== "production") {
      return [];
    }
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://va.vercel-scripts.com https://static.cloudflareinsights.com; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' data: https: blob:; " +
              "font-src 'self' data:; " +
              "connect-src 'self' https: wss: ws:; " +
              "media-src 'self' https: blob:; " +
              "object-src 'none'; " +
              "frame-ancestors 'self'; " +
              "base-uri 'self'; " +
              "form-action 'self'; " +
              "upgrade-insecure-requests;",
          },
        ],
      },
    ];
  },
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
})(nextConfig as any) as NextConfig;
