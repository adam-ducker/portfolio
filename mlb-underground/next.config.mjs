/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Keep dynamic route segments in the client Router Cache for a bit, so
    // re-visiting a page (back/forward, re-clicking a nav link) is instant
    // instead of a fresh server round-trip.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  images: {
    // Hosts next/image is allowed to optimize. Video thumbnails come from MLB's
    // CMS (img.mlbstatic.com and friends), and the player placeholder is on
    // imgur. Headshots/logos are still loaded via plain <div> backgrounds.
    remotePatterns: [
      { protocol: 'https', hostname: '**.mlbstatic.com' },
      { protocol: 'https', hostname: 'content.mlb.com' },
      { protocol: 'https', hostname: 'i.imgur.com' },
    ],
  },
};

export default nextConfig;
