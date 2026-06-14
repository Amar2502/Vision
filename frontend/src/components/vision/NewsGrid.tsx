import { useMemo } from "react";
import { CategoryCard } from "@/components/vision/CategoryCard";
import { VideosFrame } from "@/components/vision/VideosFrame";
import { compareFeedItems } from "@/lib/vision/helpers";
import type { FeedItem, VideoItem } from "@/lib/vision/types";

interface NewsGridProps {
  feeds: FeedItem[] | null;
  feedsError: boolean;
  feedsLoading: boolean;
  feedsLive: boolean;
  feedsPulsing: boolean;
  selectedCountry: string | null;
  videos: VideoItem[] | null;
  videosError: boolean;
  videosLive: boolean;
  videosPulsing: boolean;
}

export function NewsGrid({
  feeds,
  feedsError,
  feedsLoading,
  feedsLive,
  feedsPulsing,
  selectedCountry,
  videos,
  videosError,
  videosLive,
  videosPulsing,
}: NewsGridProps) {
  const grouped = useMemo(() => {
    if (!feeds) return null;
    const map: Record<string, FeedItem[]> = {};
    for (const f of feeds) {
      const key = f.category || "Uncategorized";
      (map[key] = map[key] || []).push(f);
    }

    for (const items of Object.values(map)) {
      items.sort(compareFeedItems);
    }

    return map;
  }, [feeds]);

  const categories = useMemo(() => {
    if (!grouped) return [];
    return Object.keys(grouped).sort((a, b) => {
      const maxA = Math.max(...grouped[a].map((item) => item.importance ?? 0));
      const maxB = Math.max(...grouped[b].map((item) => item.importance ?? 0));
      return maxB - maxA || a.localeCompare(b);
    });
  }, [grouped]);

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-3.5">
      <VideosFrame
        videos={videos}
        error={videosError}
        live={videosLive}
        pulsing={videosPulsing}
      />

      {feedsLoading ? (
        <div className="col-span-full text-center text-[#8a93a6] py-[60px] text-sm">
          {"Loading feeds\u2026"}
          <div className="text-[11px] text-[#5b6273] mt-2">
            Stories stream in as each source finishes processing.
          </div>
        </div>
      ) : feedsError && feeds === null ? (
        <div className="col-span-full text-center text-[#8a93a6] py-[60px] text-sm">
          Failed to load feeds.
        </div>
      ) : categories.length === 0 ? (
        <div className="col-span-full text-center text-[#8a93a6] py-[60px] text-sm">
          {feeds && feeds.length === 0
            ? "No feeds available."
            : "No stories match the current filters."}
        </div>
      ) : grouped ? (
        categories.map((cat) => (
          <CategoryCard
            key={cat}
            category={cat}
            items={grouped[cat]}
            live={feedsLive}
            pulsing={feedsPulsing}
            selectedCountry={selectedCountry}
          />
        ))
      ) : null}
    </div>
  );
}
