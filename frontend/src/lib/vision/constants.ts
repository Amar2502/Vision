import type { HazardTab, TabMeta } from "./types";

export const TAB_META: Record<HazardTab, TabMeta> = {
  news: {
    subtitle:
      "Geotagged headlines \u00b7 today's feeds \u00b7 RSS sources",
    endpoint: "/feeds",
    empty: "No geotagged stories yet.",
    fail: "Failed to load news data.",
    loading: "Loading news data\u2026",
    overlayText: "Fetching news feed",
    eventLabel: "story",
    eventLabelPlural: "stories",
  },
  earthquake: {
    subtitle: "Magnitude \u2265 2.5 \u00b7 last 48 hours \u00b7 USGS",
    endpoint: "/earthquakes",
    empty: "No magnitude 2.5+ events in the last 48 hours.",
    fail: "Failed to load earthquake data.",
    loading: "Loading earthquake data\u2026",
    overlayText: "Fetching seismic feed",
    eventLabel: "event",
    eventLabelPlural: "events",
  },
  wildfire: {
    subtitle: "Active wildfires worldwide \u00b7 NASA EONET",
    endpoint: "/wildfires",
    empty: "No open wildfire events available.",
    fail: "Failed to load wildfire data.",
    loading: "Loading wildfire data\u2026",
    overlayText: "Fetching wildfire feed",
    eventLabel: "fire",
    eventLabelPlural: "fires",
  },
  flight: {
    subtitle: "Live aircraft over India \u00b7 OpenSky Network",
    endpoint: "/flights",
    empty: "No flights currently visible over India.",
    fail: "Failed to load flight data.",
    loading: "Loading flight data\u2026",
    overlayText: "Fetching flight feed",
    eventLabel: "flight",
    eventLabelPlural: "flights",
  },
};

export const HAZARD_TABS: HazardTab[] = ["news", "earthquake", "wildfire", "flight"];

export const TAB_LABEL: Record<HazardTab, string> = {
  news: "News",
  earthquake: "Earthquakes",
  wildfire: "Wildfires",
  flight: "Flights",
};

export const INDIA_BOUNDS: [[number, number], [number, number]] = [
  [6.0, 68.0],
  [37.0, 97.0],
];

export const PLANE_SVG_PATH =
  "M21 16v-2l-8-5V3.5C13 2.67 12.33 2 11.5 2S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z";

export const PANEL_BG: Record<HazardTab, string> = {
  news:
    "bg-[#11151f] bg-[linear-gradient(180deg,rgba(34,197,94,0.05),transparent_30%)]",
  earthquake:
    "bg-[#11151f] bg-[linear-gradient(180deg,rgba(56,189,248,0.04),transparent_30%)]",
  wildfire:
    "bg-[#11151f] bg-[linear-gradient(180deg,rgba(249,115,22,0.05),transparent_30%)]",
  flight:
    "bg-[#11151f] bg-[linear-gradient(180deg,rgba(167,139,250,0.05),transparent_30%)]",
};

export const ACCENT_BAR: Record<HazardTab, string> = {
  news:
    "before:bg-[linear-gradient(90deg,transparent,#22c55e_20%,#22c55e_80%,transparent)]",
  earthquake:
    "before:bg-[linear-gradient(90deg,transparent,#38bdf8_20%,#38bdf8_80%,transparent)]",
  wildfire:
    "before:bg-[linear-gradient(90deg,transparent,#f97316_20%,#f97316_80%,transparent)]",
  flight:
    "before:bg-[linear-gradient(90deg,transparent,#a78bfa_20%,#a78bfa_80%,transparent)]",
};

export const TAB_ACTIVE: Record<HazardTab, string> = {
  news:
    "text-[#22c55e] bg-[rgba(34,197,94,0.10)] border-[rgba(34,197,94,0.40)] shadow-[0_0_12px_rgba(34,197,94,0.25)_inset]",
  earthquake:
    "text-[#38bdf8] bg-[rgba(56,189,248,0.10)] border-[rgba(56,189,248,0.40)] shadow-[0_0_12px_rgba(56,189,248,0.25)_inset]",
  wildfire:
    "text-[#f97316] bg-[rgba(249,115,22,0.10)] border-[rgba(249,115,22,0.40)] shadow-[0_0_12px_rgba(249,115,22,0.25)_inset]",
  flight:
    "text-[#a78bfa] bg-[rgba(167,139,250,0.10)] border-[rgba(167,139,250,0.40)] shadow-[0_0_12px_rgba(167,139,250,0.25)_inset]",
};

export const SPINNER_COLOR: Record<HazardTab, string> = {
  news: "text-[#22c55e]",
  earthquake: "text-[#38bdf8]",
  wildfire: "text-[#f97316]",
  flight: "text-[#a78bfa]",
};

export const STATUS_DOT: Record<HazardTab, string> = {
  news: "before:bg-[#22c55e]",
  earthquake: "before:bg-[#38bdf8]",
  wildfire: "before:bg-[#f97316]",
  flight: "before:bg-[#a78bfa]",
};
