import type { FeedItem } from "./types";

export function stripTags(html?: string): string {
  if (!html) return "";
  if (typeof document === "undefined") {
    return html.replace(/<[^>]*>/g, "").trim();
  }
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || div.innerText || "").trim();
}

export function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";

  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} days ago`;
  return d.toLocaleDateString();
}

export function isRecent(dateStr?: string, hours = 6): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  return (Date.now() - d.getTime()) / 3600000 < hours;
}

export function formatNumber(n?: number | null): string {
  if (n == null || isNaN(n)) return "\u2014";
  return new Intl.NumberFormat().format(n);
}

export function importanceLabel(score?: number): string {
  const n = score ?? 0;
  if (n >= 5) return "Critical";
  if (n >= 4) return "Major";
  if (n >= 3) return "National";
  if (n >= 2) return "Notable";
  if (n >= 1) return "Minor";
  return "Low";
}

export function importanceColor(score?: number): string {
  const n = score ?? 0;
  if (n >= 5) return "#ef4444";
  if (n >= 4) return "#f97316";
  if (n >= 3) return "#eab308";
  if (n >= 2) return "#38bdf8";
  return "#8a93a6";
}

export function compareFeedItems(a: FeedItem, b: FeedItem): number {
  const importanceDiff = (b.importance ?? 0) - (a.importance ?? 0);
  if (importanceDiff !== 0) return importanceDiff;

  const aTime = new Date(a.published ?? 0).getTime();
  const bTime = new Date(b.published ?? 0).getTime();
  return bTime - aTime;
}

export function earthquakeColor(mag: number): string {
  if (mag >= 6) return "#ef4444";
  if (mag >= 5) return "#f97316";
  if (mag >= 4) return "#eab308";
  return "#a3e635";
}

export function earthquakeMarkerRadius(mag: number): number {
  return Math.min(11, 4 + Math.max(0, mag - 2.5) * 1.3);
}

export function formatEarthquakeTime(ms: number): string {
  const d = new Date(ms);
  return isNaN(d.getTime()) ? "Unknown time" : d.toLocaleString();
}

export function escapeHtml(text: unknown): string {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const NON_SUMMARIZABLE_HOSTS = [
  "youtube.com",
  "youtu.be",
  "twitter.com",
  "x.com",
  "facebook.com",
  "instagram.com",
  "reddit.com",
  "news.google.com",
  "t.co",
  "linkedin.com",
  "tiktok.com",
  "vimeo.com",
];

const NON_SUMMARIZABLE_EXT = /\.(pdf|mp3|mp4|zip)(\?|$)/i;

export function isSummarizableSource(link?: string): boolean {
  if (!link?.trim()) return false;

  try {
    const url = new URL(link);
    if (!["http:", "https:"].includes(url.protocol)) return false;

    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (
      NON_SUMMARIZABLE_HOSTS.some(
        (blocked) => host === blocked || host.endsWith(`.${blocked}`)
      )
    ) {
      return false;
    }

    if (NON_SUMMARIZABLE_EXT.test(url.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

/** Matches the choropleth opacity formula in HazardMap. */
export function countryChoroplethIntensity(
  storyCount: number,
  maxImportance = 0
): number {
  return Math.min(
    0.72,
    0.28 + Math.log2(storyCount + 1) * 0.1 + maxImportance * 0.04
  );
}
