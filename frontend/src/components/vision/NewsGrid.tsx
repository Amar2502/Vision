import { useMemo } from "react";
import { CategoryCard } from "@/components/vision/CategoryCard";
import { VideosFrame } from "@/components/vision/VideosFrame";
import type { FeedItem, VideoItem } from "@/lib/vision/types";

interface NewsGridProps {
  feeds: FeedItem[] | null;
  feedsError: boolean;
  videos: VideoItem[] | null;
  videosError: boolean;
}

export function NewsGrid({
  feeds,
  feedsError,
  videos,
  videosError,
}: NewsGridProps) {
  const grouped = useMemo(() => {
    if (!feeds) return null;
    const map: Record<string, FeedItem[]> = {};
    for (const f of feeds) {
      const key = f.category || "Uncategorized";
      (map[key] = map[key] || []).push(f);
    }
    return map;
  }, [feeds]);

  const categories = useMemo(
    () => (grouped ? Object.keys(grouped).sort() : []),
    [grouped]
  );

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-3.5">
      <VideosFrame videos={videos} error={videosError} />

      {grouped === null ? (
        <div className="col-span-full text-center text-[#8a93a6] py-[60px] text-sm">
          {"Loading feeds\u2026"}
        </div>
      ) : feedsError ? (
        <div className="col-span-full text-center text-[#8a93a6] py-[60px] text-sm">
          Failed to load feeds.
        </div>
      ) : categories.length === 0 ? (
        <div className="col-span-full text-center text-[#8a93a6] py-[60px] text-sm">
          No feeds available.
        </div>
      ) : (
        categories.map((cat) => (
          <CategoryCard key={cat} category={cat} items={grouped[cat]} />
        ))
      )}
    </div>
  );
}
