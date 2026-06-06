import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/feeds", destination: "http://localhost:8000/feeds" },
      { source: "/earthquakes", destination: "http://localhost:8000/earthquakes" },
      { source: "/wildfires", destination: "http://localhost:8000/wildfires" },
      { source: "/flights", destination: "http://localhost:8000/flights" },
      { source: "/summarize", destination: "http://localhost:8000/summarize" },
      { source: "/videos", destination: "http://localhost:8000/videos" },
      {
        source: "/videos/summarize",
        destination: "http://localhost:8000/videos/summarize",
      },
    ];
  },
};

export default nextConfig;