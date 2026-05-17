import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/feeds", destination: "http://localhost:8000/feeds" },
      { source: "/earthquakes", destination: "http://localhost:8000/earthquakes" },
      { source: "/wildfires", destination: "http://localhost:8000/wildfires" },
      { source: "/flights", destination: "http://localhost:8000/flights" },
    ];
  },
};

export default nextConfig;