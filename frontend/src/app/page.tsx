"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/vision/Header";
import { FilterBar } from "@/components/vision/FilterBar";
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
  const [videosLoading, setVideosLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [minImportance, setMinImportance] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState("");

  const hazardMapRef = useRef<HazardMapHandle>(null);
  const feedsEverLoaded = useRef(false);
  const videosEverLoaded = useRef(false);

  const loadFeeds = useCallback(async (refresh = false) => {
    if (!refresh) {
      setFeedsLoading(true);
    }
    setFeedsError(false);

    try {
      const accumulated: FeedItem[] = [];
      await streamFeeds((incoming) => {
        accumulated.push(...incoming);
        if (!refresh) {
          setFeeds([...accumulated]);
        }
      });
      setFeeds([...accumulated]);
      feedsEverLoaded.current = true;
    } catch (err) {
      console.error(err);
      setFeedsError(true);
      if (!refresh || !feedsEverLoaded.current) {
        setFeeds([]);
      }
    } finally {
      setFeedsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeeds();
  }, [loadFeeds]);

  const loadVideos = useCallback(async (refresh = false) => {
    if (!refresh) {
      setVideosLoading(true);
    }
    setVideosError(false);

    try {
      setVideos(await fetchVideos());
      videosEverLoaded.current = true;
    } catch (err) {
      console.error(err);
      setVideosError(true);
      if (!refresh || !videosEverLoaded.current) {
        setVideos([]);
      }
    } finally {
      setVideosLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadFeeds(true),
        loadVideos(true),
        hazardMapRef.current?.refresh() ?? Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [loadFeeds, loadVideos]);

  const handleCountrySelect = useCallback((country: string | null) => {
    setSelectedCountry((prev) =>
      country && prev === country ? null : country
    );
  }, []);

  const allCategories = useMemo(() => {
    if (!feeds) return [];
    const cats = new Set<string>();
    for (const f of feeds) {
      cats.add(f.category || "Uncategorized");
    }
    return Array.from(cats).sort((a, b) => a.localeCompare(b));
  }, [feeds]);

  const filteredFeeds = useMemo(() => {
    if (!feeds) return null;

    const query = search.trim().toLowerCase();

    return feeds.filter((item) => {
      if (selectedCountry && !item.country?.includes(selectedCountry)) {
        return false;
      }
      if (minImportance > 0 && (item.importance ?? 0) < minImportance) {
        return false;
      }
      if (categoryFilter && (item.category || "Uncategorized") !== categoryFilter) {
        return false;
      }
      if (query) {
        const text = `${item.title} ${item.summary ?? ""}`.toLowerCase();
        if (!text.includes(query)) return false;
      }
      return true;
    });
  }, [feeds, selectedCountry, minImportance, categoryFilter, search]);

  const feedsLive =
    !feedsError && feeds !== null && feeds.length > 0;
  const feedsPulsing = feedsLive && (feedsLoading || refreshing);
  const videosLive =
    !videosError && videos !== null && videos.length > 0;
  const videosPulsing = videosLive && (videosLoading || refreshing);

  return (
    <div
      className={[
        "block min-h-screen w-full text-[#e6e9ef] text-[13px] leading-[1.4]",
        "px-[22px] pt-[18px] pb-8 max-[640px]:p-3",
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
          refreshing={refreshing}
          selectedCountry={selectedCountry}
          onCountrySelect={handleCountrySelect}
        />

        {feeds && feeds.length > 0 ? (
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            selectedCountry={selectedCountry}
            onCountryClear={() => setSelectedCountry(null)}
            minImportance={minImportance}
            onMinImportanceChange={setMinImportance}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
            categories={allCategories}
            resultCount={filteredFeeds?.length ?? 0}
            totalCount={feeds.length}
          />
        ) : null}

        <NewsGrid
          feeds={filteredFeeds}
          feedsError={feedsError}
          feedsLoading={feedsLoading && feeds === null}
          feedsLive={feedsLive}
          feedsPulsing={feedsPulsing}
          selectedCountry={selectedCountry}
          videos={videos}
          videosError={videosError}
          videosLive={videosLive}
          videosPulsing={videosPulsing}
        />
      </main>
    </div>
  );
}
