"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Header } from "@/components/vision/Header";
import { HazardMap, type HazardMapHandle } from "@/components/vision/HazardMap";
import { NewsGrid } from "@/components/vision/NewsGrid";
import { fetchVideos, streamFeeds } from "@/lib/vision/api";
import type { FeedItem, VideoItem } from "@/lib/vision/types";

export default function VisionDashboard() {
  const [feeds, setFeeds] = useState<FeedItem[] | null>(null);
  const [feedsError, setFeedsError] = useState(false);
  const [feedsLoading, setFeedsLoading] = useState(true);
  const [videos, setVideos] = useState<VideoItem[] | null>(null);
  const [videosError, setVideosError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const hazardMapRef = useRef<HazardMapHandle>(null);

  const loadFeeds = useCallback(async () => {
    setFeeds(null);
    setFeedsError(false);
    setFeedsLoading(true);

    try {
      await streamFeeds((incoming) => {
        setFeeds((prev) => [...(prev ?? []), ...incoming]);
      });
      setFeeds((prev) => prev ?? []);
    } catch (err) {
      console.error(err);
      setFeedsError(true);
      setFeeds([]);
    } finally {
      setFeedsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeeds();
  }, [loadFeeds]);

  const loadVideos = useCallback(async () => {
    setVideos(null);
    setVideosError(false);

    try {
      setVideos(await fetchVideos());
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
            feedsLoading={feedsLoading}
          />

          <NewsGrid
            feeds={feeds}
            feedsError={feedsError}
            feedsLoading={feedsLoading}
            videos={videos}
            videosError={videosError}
          />
        </main>
      </div>
    </>
  );
}
