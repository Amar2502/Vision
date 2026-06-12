"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Header } from "@/components/vision/Header";
import { HazardMap, type HazardMapHandle } from "@/components/vision/HazardMap";
import { NewsGrid } from "@/components/vision/NewsGrid";
import type { FeedItem, VideoItem } from "@/lib/vision/types";

export default function VisionDashboard() {
  const [feeds, setFeeds] = useState<FeedItem[] | null>(null);
  const [feedsError, setFeedsError] = useState(false);
  const [videos, setVideos] = useState<VideoItem[] | null>(null);
  const [videosError, setVideosError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const hazardMapRef = useRef<HazardMapHandle>(null);

  const loadFeeds = useCallback(async () => {
    setFeeds(null);
    setFeedsError(false);
    try {
      const res = await fetch("/feeds");
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const ingest = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        const chunk = JSON.parse(trimmed) as {
          source?: string;
          feeds?: FeedItem[];
        };
        const incoming = Array.isArray(chunk.feeds) ? chunk.feeds : [];
        if (incoming.length === 0) return;
        setFeeds((prev) => [...(prev ?? []), ...incoming]);
      };

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          ingest(line);
        }
      }

      buffer += decoder.decode();
      ingest(buffer);

      setFeeds((prev) => prev ?? []);
    } catch (err) {
      console.error(err);
      setFeedsError(true);
      setFeeds([]);
    }
  }, []);

  useEffect(() => {
    loadFeeds();
  }, [loadFeeds]);

  const loadVideos = useCallback(async () => {
    setVideos(null);
    setVideosError(false);
    try {
      const res = await fetch("/videos", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setVideos(Array.isArray(data) ? (data as VideoItem[]) : []);
    } catch (err) {
      console.error(err);
      setVideosError(true);
      setVideos([]);
    }
  }, []);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadFeeds(),
        loadVideos(),
        hazardMapRef.current?.refresh() ?? Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [loadFeeds, loadVideos]);

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
      />

      <div
        className={[
          "block min-h-screen w-full text-[#e6e9ef] text-[13px] leading-[1.4]",
          "px-[22px] pt-[18px] pb-8 max-[640px]:p-3",
          "font-[Inter,system-ui,sans-serif]",
          "bg-[#0a0d14]",
          "bg-[radial-gradient(1200px_600px_at_10%_-10%,rgba(56,189,248,0.06),transparent_60%),radial-gradient(1000px_500px_at_110%_0%,rgba(249,115,22,0.05),transparent_60%)]",
        ].join(" ")}
      >
        <Header refreshing={refreshing} onRefresh={handleRefresh} />

        <main>
          <HazardMap
            ref={hazardMapRef}
            feeds={feeds}
            feedsError={feedsError}
          />

          <NewsGrid
            feeds={feeds}
            feedsError={feedsError}
            videos={videos}
            videosError={videosError}
          />
        </main>
      </div>
    </>
  );
}
