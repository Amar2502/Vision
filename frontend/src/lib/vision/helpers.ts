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

export function getMediaUrl(item: FeedItem): string {
  const u = item.media_url ?? item.media;
  return typeof u === "string" ? u.trim() : "";
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

export function formatWildfireDate(dateStr?: string): string {
  if (!dateStr) return "Unknown time";
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleString();
}

export function formatAltitude(meters?: number | null): string {
  if (meters == null || isNaN(meters)) return "\u2014";
  return `${formatNumber(Math.round(meters))} m`;
}

export function formatVelocity(mps?: number | null): string {
  if (mps == null || isNaN(mps)) return "\u2014";
  return `${formatNumber(Math.round(mps * 3.6))} km/h`;
}

export function formatHeading(deg?: number | null): string {
  if (deg == null || isNaN(deg)) return "\u2014";
  return `${Math.round(deg)}\u00b0`;
}

export function formatFlightTime(sec?: number | null): string {
  if (sec == null) return "\u2014";
  const d = new Date(sec * 1000);
  return isNaN(d.getTime()) ? "\u2014" : d.toLocaleTimeString();
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

export function isSummarizableSource(source?: string): boolean {
  return (source?.trim().toLowerCase() ?? "") !== "reuters";
}
