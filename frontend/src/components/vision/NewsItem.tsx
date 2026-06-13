"use client";

import { useCallback, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { summarizeArticle } from "@/lib/vision/api";
import {
  importanceColor,
  importanceLabel,
  isRecent,
  isSummarizableSource,
  stripTags,
  timeAgo,
} from "@/lib/vision/helpers";
import type { FeedItem } from "@/lib/vision/types";

export function SummarizeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3 L13.2 8.8 L19 10 L13.2 11.2 L12 17 L10.8 11.2 L5 10 L10.8 8.8 Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M18 4 L18.6 6.4 L21 7 L18.6 7.6 L18 10 L17.4 7.6 L15 7 L17.4 6.4 Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        opacity="0.85"
      />
    </svg>
  );
}

interface NewsItemProps {
  item: FeedItem;
}

export function NewsItem({ item }: NewsItemProps) {
  const rssSummary = stripTags(item.summary);
  const recent = isRecent(item.published);
  const canSummarize = isSummarizableSource(item.link);
  const importance = item.importance ?? 0;
  const showImportance = importance >= 3;

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summarizeLoading, setSummarizeLoading] = useState(false);
  const [summarizeError, setSummarizeError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (aiSummary || summarizeLoading) return;

    setSummarizeLoading(true);
    setSummarizeError(null);

    try {
      setAiSummary(await summarizeArticle(item.link));
    } catch (err) {
      console.error(err);
      setSummarizeError(
        err instanceof Error ? err.message : "Could not summarize this article."
      );
    } finally {
      setSummarizeLoading(false);
    }
  }, [aiSummary, summarizeLoading, item.link]);

  const handlePopoverOpenChange = (open: boolean) => {
    setPopoverOpen(open);
    if (open) fetchSummary();
  };

  const summarizeControl = canSummarize ? (
    <Popover open={popoverOpen} onOpenChange={handlePopoverOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Summarize article"
          className={[
            "absolute top-2.5 right-2 z-10 flex items-center justify-center",
            "w-7 h-7 rounded-md border transition-[color,background,border-color,box-shadow] duration-200",
            popoverOpen
              ? "text-[#22c55e] bg-[rgba(34,197,94,0.15)] border-[rgba(34,197,94,0.45)] shadow-[0_0_10px_rgba(34,197,94,0.2)]"
              : "text-[#8a93a6] bg-[#161b27] border-[#1f2533] hover:text-[#22c55e] hover:border-[rgba(34,197,94,0.4)] hover:bg-[rgba(34,197,94,0.08)]",
            summarizeLoading ? "cursor-wait opacity-80" : "cursor-pointer",
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
          <PopoverTitle className="flex items-center gap-2 text-[11px] font-bold tracking-[1.2px] uppercase text-[#22c55e]">
            <SummarizeIcon className="w-3.5 h-3.5" />
            AI Summary
          </PopoverTitle>
          <p className="text-[11px] text-[#8a93a6] font-normal leading-snug line-clamp-2 m-0">
            {item.title}
          </p>
        </PopoverHeader>
        <div className="overflow-y-auto px-4 py-3.5 min-h-[120px] max-h-[min(60vh,380px)] [scrollbar-color:#2a3245_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-[#232a3a] [&::-webkit-scrollbar-thumb]:rounded">
          {summarizeLoading ? (
            <p className="text-[13px] text-[#8a93a6] m-0 leading-relaxed">
              Reading article and summarizing…
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
              Preparing summary…
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  ) : null;

  return (
    <article className="relative border-b border-[#1a1f2b] last:border-b-0 transition-colors duration-150 hover:bg-white/2">
      {summarizeControl}

      <a
        className={[
          "flex items-start gap-2.5 py-2.5 pl-3 no-underline text-inherit",
          canSummarize ? "pr-11" : "pr-3",
        ].join(" ")}
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-x-1.5 gap-y-1 mb-1.5">
            <span className="text-[10px] font-bold tracking-[0.8px] text-[#8a93a6] uppercase">
              {item.source}
            </span>
            {recent ? (
              <span className="text-[9px] font-bold tracking-[0.6px] py-0.5 px-1.5 rounded-sm uppercase bg-[rgba(34,197,94,0.18)] text-[#22c55e] border border-[rgba(34,197,94,0.4)]">
                NEW
              </span>
            ) : null}
            {showImportance ? (
              <span
                className="text-[9px] font-bold tracking-[0.6px] py-0.5 px-1.5 rounded-sm uppercase border"
                style={{
                  color: importanceColor(importance),
                  borderColor: `${importanceColor(importance)}66`,
                  background: `${importanceColor(importance)}22`,
                }}
              >
                {importanceLabel(importance)}
              </span>
            ) : null}
          </div>
          <div className="text-[12.5px] font-medium text-[#e6e9ef] leading-[1.45] mb-1 line-clamp-3">
            {item.title}
          </div>
          {rssSummary ? (
            <div className="text-[11.5px] text-[#8a93a6] leading-normal mb-1.5 line-clamp-2">
              {rssSummary}
            </div>
          ) : null}
          <div className="text-[10px] text-[#5b6273] tracking-[0.3px]">
            {timeAgo(item.published)}
          </div>
        </div>
      </a>
    </article>
  );
}
