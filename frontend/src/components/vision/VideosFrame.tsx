"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SummarizeIcon } from "@/components/vision/NewsItem";
import { LiveBadge } from "@/components/vision/LiveBadge";
import { NO_VIDEO_TRANSCRIPT, summarizeVideo } from "@/lib/vision/api";
import { timeAgo } from "@/lib/vision/helpers";
import type { VideoItem } from "@/lib/vision/types";

function groupVideosBySource(
  videos: VideoItem[] | null
): Map<string, VideoItem[]> | null {
  if (!videos) return null;

  const map = new Map<string, VideoItem[]>();

  for (const v of videos) {
    const src = v.source?.trim() || "Unknown";
    const list = map.get(src);
    if (list) list.push(v);
    else map.set(src, [v]);
  }

  for (const list of map.values()) {
    list.sort(
      (a, b) =>
        new Date(b.published ?? 0).getTime() -
        new Date(a.published ?? 0).getTime()
    );
  }

  return map;
}

interface VideosFrameProps {
  videos: VideoItem[] | null;
  error: boolean;
  live: boolean;
  pulsing: boolean;
}

export function VideosFrame({ videos, error, live, pulsing }: VideosFrameProps) {
  const bySource = useMemo(() => groupVideosBySource(videos), [videos]);
  const sources = useMemo(
    () =>
      bySource
        ? Array.from(bySource.keys()).sort((a, b) => a.localeCompare(b))
        : [],
    [bySource]
  );

  const [activeSource, setActiveSource] = useState("");
  const [activeVideoIdx, setActiveVideoIdx] = useState(0);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summarizeLoading, setSummarizeLoading] = useState(false);
  const [summarizeError, setSummarizeError] = useState<string | null>(null);
  const [noTranscript, setNoTranscript] = useState(false);

  useEffect(() => {
    if (!sources.length) {
      setActiveSource("");
      setActiveVideoIdx(0);
      return;
    }
    setActiveSource((prev) =>
      prev && sources.includes(prev) ? prev : sources[0]
    );
    setActiveVideoIdx(0);
  }, [sources]);

  const sourceVideos =
    activeSource && bySource ? bySource.get(activeSource) ?? [] : [];
  const safeVideoIdx =
    sourceVideos.length > 0
      ? Math.min(activeVideoIdx, sourceVideos.length - 1)
      : 0;
  const active = sourceVideos[safeVideoIdx] ?? null;
  const count = videos?.length ?? 0;

  useEffect(() => {
    setPopoverOpen(false);
    setAiSummary(null);
    setSummarizeLoading(false);
    setSummarizeError(null);
    setNoTranscript(false);
  }, [active?.id]);

  const fetchVideoSummary = useCallback(async () => {
    if (!active?.id || aiSummary || summarizeLoading || noTranscript) return;

    setSummarizeLoading(true);
    setSummarizeError(null);

    try {
      const result = await summarizeVideo(active.id);
      if (result.trim() === NO_VIDEO_TRANSCRIPT) {
        setNoTranscript(true);
        return;
      }
      setAiSummary(result);
    } catch (err) {
      console.error(err);
      setSummarizeError(
        err instanceof Error ? err.message : "Could not summarize this video."
      );
    } finally {
      setSummarizeLoading(false);
    }
  }, [active?.id, aiSummary, summarizeLoading, noTranscript]);

  const handleSummarizeOpenChange = (open: boolean) => {
    setPopoverOpen(open);
    if (open) fetchVideoSummary();
  };

  const switchSource = (source: string) => {
    setActiveSource(source);
    setActiveVideoIdx(0);
  };

  return (
    <section
      className={[
        "relative flex flex-col col-span-1 sm:col-span-2",
        "h-[420px] max-[640px]:h-[380px] overflow-hidden rounded-md",
        "bg-[#11151f] border border-[#1f2533] transition-colors duration-200 hover:border-[#2a3245]",
        "before:content-[''] before:absolute before:top-0 before:left-0 before:right-0",
        "before:h-0.5 before:bg-[#ef4444] before:opacity-85",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2 py-3 px-3 pb-2.5 border-b border-[#1a1f2b]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <svg
            className="w-3.5 h-3.5 shrink-0 text-[#ef4444]"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.26 5 12 5 12 5s-6.26 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26.2 26.2 0 0 0 2 12a26.2 26.2 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.74 19 12 19 12 19s6.26 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26.2 26.2 0 0 0 22 12a26.2 26.2 0 0 0-.4-4.8z"
              fill="currentColor"
            />
            <path d="M10 15.5v-7l6 3.5-6 3.5z" fill="#11151f" />
          </svg>
          <div className="min-w-0 text-xs font-bold tracking-[1.4px] uppercase text-[#e6e9ef] overflow-hidden text-ellipsis whitespace-nowrap">
            Videos
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <LiveBadge active={live} pulsing={pulsing} variant="red" />
          <span className="text-[10px] font-semibold text-[#8a93a6] py-0.5 px-[7px] rounded-[10px] bg-[#161b27] border border-[#1f2533] min-w-[22px] text-center">
            {videos === null ? "\u2026" : count}
          </span>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Video sources"
        className="flex gap-1 px-2 py-1.5 border-b border-[#1a1f2b] shrink-0"
      >
        {videos === null ? (
          <span className="text-[10px] text-[#5b6273] py-1.5 px-2.5 tracking-[0.6px] uppercase">
            Loading sources&hellip;
          </span>
        ) : sources.length === 0 ? (
          <span className="text-[10px] text-[#5b6273] py-1.5 px-2.5 tracking-[0.6px] uppercase">
            {error ? "Failed to load videos." : "No video sources available."}
          </span>
        ) : (
          sources.map((source) => {
            const isActive = source === activeSource;
            const sourceCount = bySource?.get(source)?.length ?? 0;
            return (
              <button
                key={source}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`videos-panel-${source.replace(/\s+/g, "-")}`}
                onClick={() => switchSource(source)}
                className={[
                  "inline-flex items-center gap-2 py-1.5 px-3 rounded-md cursor-pointer",
                  "text-[10.5px] font-bold tracking-[0.8px] uppercase",
                  "border transition-[color,background,border-color,box-shadow] duration-180",
                  isActive
                    ? "text-[#ef4444] bg-[rgba(239,68,68,0.10)] border-[rgba(239,68,68,0.40)] shadow-[0_0_12px_rgba(239,68,68,0.25)_inset]"
                    : "bg-transparent border-transparent text-[#8a93a6] hover:text-[#e6e9ef] hover:bg-white/4",
                ].join(" ")}
              >
                <span className="truncate max-[640px]:max-w-[88px]">{source}</span>
                <span className="text-[9px] font-semibold text-[#8a93a6] py-0.5 px-1.5 rounded-[8px] bg-[#161b27] border border-[#1f2533] min-w-[18px] text-center">
                  {sourceCount}
                </span>
              </button>
            );
          })
        )}
      </div>

      <div
        id={
          activeSource
            ? `videos-panel-${activeSource.replace(/\s+/g, "-")}`
            : "videos-panel"
        }
        role="tabpanel"
        className="flex flex-1 min-h-0"
      >
        <div className="flex-1 min-w-0 bg-black relative overflow-hidden">
          {active?.id ? (
            <>
              <iframe
                key={active.id}
                src={`https://www.youtube.com/embed/${active.id}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`}
                title={active.title}
                allow="autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 w-full h-full border-0"
              />

              <Popover open={popoverOpen} onOpenChange={handleSummarizeOpenChange}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="Summarize video"
                    className={[
                      "absolute top-2.5 right-2.5 z-20 flex items-center justify-center",
                      "w-7 h-7 rounded-md border transition-[color,background,border-color,box-shadow] duration-200",
                      popoverOpen
                        ? "text-[#ef4444] bg-[rgba(239,68,68,0.15)] border-[rgba(239,68,68,0.45)] shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                        : "text-[#e6e9ef] bg-[rgba(10,13,20,0.75)] border-[#1f2533] hover:text-[#ef4444] hover:border-[rgba(239,68,68,0.4)] hover:bg-[rgba(239,68,68,0.08)]",
                      summarizeLoading
                        ? "cursor-wait opacity-80"
                        : "cursor-pointer",
                    ].join(" ")}
                  >
                    {summarizeLoading ? (
                      <span className="w-3.5 h-3.5 border-2 border-transparent border-t-current rounded-full animate-spin" />
                    ) : (
                      <SummarizeIcon className="w-3.5 h-3.5" />
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="left"
                  align="start"
                  sideOffset={8}
                  collisionPadding={12}
                  className={[
                    "w-[min(92vw,32rem)] sm:w-lg max-w-lg",
                    "max-h-[min(75vh,480px)] p-0 gap-0 overflow-hidden",
                    "bg-[#161b27] text-[#e6e9ef] border-[#1f2533]",
                    "shadow-[0_16px_48px_rgba(0,0,0,0.55)] ring-1 ring-[#2a3245]",
                  ].join(" ")}
                >
                  <PopoverHeader className="shrink-0 gap-1 px-4 pt-4 pb-3 border-b border-[#1a1f2b]">
                    <PopoverTitle className="flex items-center gap-2 text-[11px] font-bold tracking-[1.2px] uppercase text-[#ef4444]">
                      <SummarizeIcon className="w-3.5 h-3.5" />
                      Video Summary
                    </PopoverTitle>
                    <p className="text-[11px] text-[#8a93a6] font-normal leading-snug line-clamp-2 m-0">
                      {active.title}
                    </p>
                  </PopoverHeader>
                  <div className="overflow-y-auto px-4 py-3.5 min-h-[120px] max-h-[min(60vh,380px)] [scrollbar-color:#2a3245_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-[#232a3a] [&::-webkit-scrollbar-thumb]:rounded">
                    {summarizeLoading ? (
                      <p className="text-[13px] text-[#8a93a6] m-0 leading-relaxed">
                        Fetching transcript and summarizing&hellip;
                      </p>
                    ) : noTranscript ? (
                      <p className="text-[13px] text-[#f59e0b] m-0 leading-relaxed">
                        No transcript found for this video. Summaries need
                        captions or subtitles on YouTube.
                      </p>
                    ) : summarizeError ? (
                      <p className="text-[13px] text-[#ef4444] m-0 leading-relaxed">
                        {summarizeError}
                      </p>
                    ) : aiSummary ? (
                      <p className="text-[13px] text-[#c8cdd8] m-0 leading-[1.65] whitespace-pre-wrap">
                        {aiSummary}
                      </p>
                    ) : (
                      <p className="text-[13px] text-[#8a93a6] m-0 leading-relaxed">
                        Preparing summary&hellip;
                      </p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              <div className="absolute left-0 right-0 bottom-0 pointer-events-none px-3 py-2 bg-[linear-gradient(180deg,transparent,rgba(10,13,20,0.85))]">
                <div className="text-[9px] tracking-[1px] uppercase text-[#8a93a6] font-bold mb-0.5">
                  {timeAgo(active.published) || "Recent"}
                </div>
                <div className="text-[11.5px] text-[#e6e9ef] font-medium leading-snug line-clamp-2">
                  {active.title}
                </div>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[#5b6273] text-xs tracking-[1px] uppercase">
              {videos === null
                ? "Loading\u2026"
                : error
                ? "Could not load videos."
                : "No videos to play."}
            </div>
          )}
        </div>

        <aside
          aria-label={`${activeSource || "Source"} videos`}
          className={[
            "w-[172px] max-[640px]:w-[128px] shrink-0 flex flex-col",
            "border-l border-[#1a1f2b] bg-[#0f131c]",
            "overflow-y-auto [scrollbar-color:#2a3245_transparent]",
            "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent",
            "[&::-webkit-scrollbar-thumb]:bg-[#232a3a] [&::-webkit-scrollbar-thumb]:rounded-[3px]",
          ].join(" ")}
        >
          {sourceVideos.length === 0 ? (
            <div className="py-6 px-2.5 text-center text-[#5b6273] text-[10px] leading-snug">
              {videos === null ? "Loading\u2026" : "No videos in this source."}
            </div>
          ) : (
            sourceVideos.map((v, i) => {
              const isSelected = i === safeVideoIdx;
              return (
                <button
                  key={v.id || `${v.link}-${i}`}
                  type="button"
                  title={v.title}
                  onClick={() => setActiveVideoIdx(i)}
                  className={[
                    "w-full text-left p-2 border-b border-[#1a1f2b] last:border-b-0",
                    "transition-colors duration-150 cursor-pointer",
                    isSelected
                      ? "bg-[rgba(239,68,68,0.10)] border-l-2 border-l-[#ef4444]"
                      : "hover:bg-white/3 border-l-2 border-l-transparent",
                  ].join(" ")}
                >
                  <div className="relative w-full aspect-video rounded overflow-hidden bg-[#161b27] border border-[#1a1f2b] mb-1.5">
                    {v.id ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover block"
                      />
                    ) : null}
                    {isSelected ? (
                      <span className="absolute inset-0 ring-1 ring-[#ef4444] ring-inset pointer-events-none" />
                    ) : null}
                  </div>
                  <div
                    className={[
                      "text-[10px] font-medium leading-snug line-clamp-2 mb-0.5",
                      isSelected ? "text-[#ef4444]" : "text-[#e6e9ef]",
                    ].join(" ")}
                  >
                    {v.title}
                  </div>
                  <div className="text-[9px] text-[#5b6273] tracking-[0.3px]">
                    {timeAgo(v.published)}
                  </div>
                </button>
              );
            })
          )}
        </aside>
      </div>
    </section>
  );
}
