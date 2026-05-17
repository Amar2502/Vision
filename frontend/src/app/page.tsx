"use client";

import {
  act,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

declare global {
  interface Window {
    L: any;
  }
}

/* ---------- Types ---------- */

interface FeedItem {
  source: string;
  title: string;
  link: string;
  summary?: string;
  published?: string;
  category?: string;
  media_url?: string;
  media?: string;
}

interface EarthquakeEvent {
  magnitude: number;
  place: string;
  time: number;
  felt?: number | null;
  cdi?: number | null;
  coordinates: number[]; // [lng, lat, depth]
}

interface WildfireEvent {
  title: string;
  description?: string;
  source?: string;
  magnitudeValue?: number | null;
  magnitudeUnit?: string | null;
  date?: string;
  coordinates: number[];
}

interface FlightEvent {
  callsign?: string | null;
  geo_altitude?: number | null;
  latitude: number;
  longitude: number;
  on_ground: boolean;
  origin_country?: string;
  time_position?: number | null;
  true_track?: number | null;
  velocity?: number | null;
  vertical_rate?: number | null;
}

type HazardTab = "earthquake" | "wildfire" | "flight";

interface TabMeta {
  subtitle: string;
  endpoint: string;
  empty: string;
  fail: string;
  loading: string;
  overlayText: string;
  eventLabel: string;
}

const TAB_META: Record<HazardTab, TabMeta> = {
  earthquake: {
    subtitle: "Magnitude \u2265 2.5 \u00b7 last 48 hours \u00b7 USGS",
    endpoint: "/earthquakes",
    empty: "No magnitude 2.5+ events in the last 48 hours.",
    fail: "Failed to load earthquake data.",
    loading: "Loading earthquake data\u2026",
    overlayText: "Fetching seismic feed",
    eventLabel: "event",
  },
  wildfire: {
    subtitle: "Active wildfires worldwide \u00b7 NASA EONET",
    endpoint: "/wildfires",
    empty: "No open wildfire events available.",
    fail: "Failed to load wildfire data.",
    loading: "Loading wildfire data\u2026",
    overlayText: "Fetching wildfire feed",
    eventLabel: "fire",
  },
  flight: {
    subtitle: "Live aircraft over India \u00b7 OpenSky Network",
    endpoint: "/flights",
    empty: "No flights currently visible over India.",
    fail: "Failed to load flight data.",
    loading: "Loading flight data\u2026",
    overlayText: "Fetching flight feed",
    eventLabel: "flight",
  },
};

const HAZARD_TABS: HazardTab[] = ["earthquake", "wildfire", "flight"];
const TAB_LABEL: Record<HazardTab, string> = {
  earthquake: "Earthquakes",
  wildfire: "Wildfires",
  flight: "Flights",
};

const INDIA_BOUNDS: [[number, number], [number, number]] = [
  [6.0, 68.0],
  [37.0, 97.0],
];

const PLANE_SVG_PATH =
  "M21 16v-2l-8-5V3.5C13 2.67 12.33 2 11.5 2S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z";

/* ---------- Per-tab Tailwind class tables ----------
 * Tailwind v4 scans source for literal class names. Keeping
 * the full strings here ensures they are JIT-compiled.
 */

const PANEL_BG: Record<HazardTab, string> = {
  earthquake:
    "bg-[#11151f] bg-[linear-gradient(180deg,rgba(56,189,248,0.04),transparent_30%)]",
  wildfire:
    "bg-[#11151f] bg-[linear-gradient(180deg,rgba(249,115,22,0.05),transparent_30%)]",
  flight:
    "bg-[#11151f] bg-[linear-gradient(180deg,rgba(167,139,250,0.05),transparent_30%)]",
};

const ACCENT_BAR: Record<HazardTab, string> = {
  earthquake:
    "before:bg-[linear-gradient(90deg,transparent,#38bdf8_20%,#38bdf8_80%,transparent)]",
  wildfire:
    "before:bg-[linear-gradient(90deg,transparent,#f97316_20%,#f97316_80%,transparent)]",
  flight:
    "before:bg-[linear-gradient(90deg,transparent,#a78bfa_20%,#a78bfa_80%,transparent)]",
};

const TAB_ACTIVE: Record<HazardTab, string> = {
  earthquake:
    "text-[#38bdf8] bg-[rgba(56,189,248,0.10)] border-[rgba(56,189,248,0.40)] shadow-[0_0_12px_rgba(56,189,248,0.25)_inset]",
  wildfire:
    "text-[#f97316] bg-[rgba(249,115,22,0.10)] border-[rgba(249,115,22,0.40)] shadow-[0_0_12px_rgba(249,115,22,0.25)_inset]",
  flight:
    "text-[#a78bfa] bg-[rgba(167,139,250,0.10)] border-[rgba(167,139,250,0.40)] shadow-[0_0_12px_rgba(167,139,250,0.25)_inset]",
};

const SPINNER_COLOR: Record<HazardTab, string> = {
  earthquake: "text-[#38bdf8]",
  wildfire: "text-[#f97316]",
  flight: "text-[#a78bfa]",
};

const STATUS_DOT: Record<HazardTab, string> = {
  earthquake: "before:bg-[#38bdf8]",
  wildfire: "before:bg-[#f97316]",
  flight: "before:bg-[#a78bfa]",
};

/* ---------- Pure helpers ---------- */

function stripTags(html?: string): string {
  if (!html) return "";
  if (typeof document === "undefined") {
    return html.replace(/<[^>]*>/g, "").trim();
  }
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || div.innerText || "").trim();
}

function timeAgo(dateStr?: string): string {
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

function isRecent(dateStr?: string, hours = 6): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  return (Date.now() - d.getTime()) / 3600000 < hours;
}

function formatNumber(n?: number | null): string {
  if (n == null || isNaN(n)) return "\u2014";
  return new Intl.NumberFormat().format(n);
}

function getMediaUrl(item: FeedItem): string {
  const u = item.media_url ?? item.media;
  return typeof u === "string" ? u.trim() : "";
}

function earthquakeColor(mag: number): string {
  if (mag >= 6) return "#ef4444";
  if (mag >= 5) return "#f97316";
  if (mag >= 4) return "#eab308";
  return "#a3e635";
}

function earthquakeMarkerRadius(mag: number): number {
  return Math.min(11, 4 + Math.max(0, mag - 2.5) * 1.3);
}

function formatEarthquakeTime(ms: number): string {
  const d = new Date(ms);
  return isNaN(d.getTime()) ? "Unknown time" : d.toLocaleString();
}

function formatWildfireDate(dateStr?: string): string {
  if (!dateStr) return "Unknown time";
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleString();
}

function formatAltitude(meters?: number | null): string {
  if (meters == null || isNaN(meters)) return "\u2014";
  return `${formatNumber(Math.round(meters))} m`;
}

function formatVelocity(mps?: number | null): string {
  if (mps == null || isNaN(mps)) return "\u2014";
  return `${formatNumber(Math.round(mps * 3.6))} km/h`;
}

function formatHeading(deg?: number | null): string {
  if (deg == null || isNaN(deg)) return "\u2014";
  return `${Math.round(deg)}\u00b0`;
}

function formatFlightTime(sec?: number | null): string {
  if (sec == null) return "\u2014";
  const d = new Date(sec * 1000);
  return isNaN(d.getTime()) ? "\u2014" : d.toLocaleTimeString();
}

function escapeHtml(text: unknown): string {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ---------- Leaflet CDN loader ---------- */

let leafletPromise: Promise<unknown> | null = null;

function loadLeaflet(): Promise<unknown> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("SSR"));
  }
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector("link[data-leaflet]")) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.integrity =
        "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
      link.crossOrigin = "";
      link.setAttribute("data-leaflet", "");
      document.head.appendChild(link);
    }

    const existing = document.querySelector(
      "script[data-leaflet]"
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(window.L));
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Leaflet"))
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.integrity =
      "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
    script.crossOrigin = "";
    script.setAttribute("data-leaflet", "");
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error("Failed to load Leaflet"));
    document.head.appendChild(script);
  });
  return leafletPromise;
}

/* ---------- Tab icons ---------- */

function TabIcon({ tab }: { tab: HazardTab }) {
  if (tab === "earthquake") {
    return (
      <svg
        className="w-3.5 h-3.5 shrink-0"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          d="M2 12 H5 L7 6 L10 18 L13 4 L16 20 L19 10 L22 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (tab === "wildfire") {
    return (
      <svg
        className="w-3.5 h-3.5 shrink-0"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          d="M12 3 C13 7 17 8 17 13 C17 16.5 14.7 19 12 19 C9.3 19 7 16.5 7 13 C7 11 8 10 9 9.5 C9 11 10 12 11 12 C10 9 12 7 12 3 Z"
          fill="currentColor"
          opacity="0.95"
        />
      </svg>
    );
  }
  return (
    <svg
      className="w-3.5 h-3.5 shrink-0"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d={PLANE_SVG_PATH} fill="currentColor" />
    </svg>
  );
}

/* ---------- News sub-components ---------- */

function NewsItem({ item }: { item: FeedItem }) {
  const summary = stripTags(item.summary);
  const mediaUrl = getMediaUrl(item);
  const recent = isRecent(item.published);

  return (
    <a
      className="flex items-start gap-2.5 py-2.5 px-3 border-b border-[#1a1f2b] last:border-b-0 cursor-pointer no-underline text-inherit transition-colors duration-150 hover:bg-white/2"
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
    >
      {mediaUrl ? (
        <div className="shrink-0 w-[76px] h-[52px] rounded overflow-hidden bg-[#161b27] border border-[#1a1f2b]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover block"
          />
        </div>
      ) : null}
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
        </div>
        <div className="text-[12.5px] font-medium text-[#e6e9ef] leading-[1.45] mb-1 line-clamp-3">
          {item.title}
        </div>
        {summary ? (
          <div className="text-[11.5px] text-[#8a93a6] leading-normal mb-1.5 line-clamp-2">
            {summary}
          </div>
        ) : null}
        <div className="text-[10px] text-[#5b6273] tracking-[0.3px]">
          {timeAgo(item.published)}
        </div>
      </div>
    </a>
  );
}

function CategoryCard({
  category,
  items,
}: {
  category: string;
  items: FeedItem[];
}) {
  return (
    <section className="relative flex flex-col h-[420px] max-[640px]:h-[380px] overflow-hidden rounded-md bg-[#11151f] border border-[#1f2533] transition-colors duration-200 hover:border-[#2a3245] before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-0.5 before:bg-[#22c55e] before:opacity-85">
      <div className="flex items-center justify-between gap-2 py-3 px-3 pb-2.5 border-b border-[#1a1f2b]">
        <div className="flex-1 min-w-0 text-xs font-bold tracking-[1.4px] uppercase text-[#e6e9ef] overflow-hidden text-ellipsis whitespace-nowrap">
          {category}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-[1px] py-0.5 px-1.5 rounded-[3px] bg-[rgba(34,197,94,0.15)] text-[#22c55e] border border-[rgba(34,197,94,0.35)] before:content-[''] before:w-[5px] before:h-[5px] before:rounded-full before:bg-[#22c55e] before:shadow-[0_0_6px_#22c55e] before:animate-pulse">
            LIVE
          </span>
          <span className="text-[10px] font-semibold text-[#8a93a6] py-0.5 px-[7px] rounded-[10px] bg-[#161b27] border border-[#1f2533] min-w-[22px] text-center">
            {items.length}
          </span>
        </div>
      </div>
        <div className="flex-1 overflow-y-auto py-1 scrollbar-thin [scrollbar-color:#2a3245_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#232a3a] [&::-webkit-scrollbar-thumb]:rounded-[3px] [&::-webkit-scrollbar-thumb:hover]:bg-[#2f3748]">
        {items.length ? (
          items.map((item, idx) => (
            <NewsItem key={`${item.link}-${idx}`} item={item} />
          ))
        ) : (
          <div className="py-7 px-3 text-center text-[#5b6273] text-xs">
            No stories available.
          </div>
        )}
      </div>
    </section>
  );
}

/* =========================================================
 * Main page
 * ========================================================= */

export default function VisionDashboard() {
  /* ----- Feed state ----- */
  const [feeds, setFeeds] = useState<FeedItem[] | null>(null);
  const [feedsError, setFeedsError] = useState(false);

  /* ----- Hazard state ----- */
  const [activeTab, setActiveTab] = useState<HazardTab>("earthquake");
  const [hazardCount, setHazardCount] = useState<string>("\u2014");
  const [hazardStatus, setHazardStatus] = useState<string>(
    TAB_META.earthquake.loading
  );
  const [hazardError, setHazardError] = useState(false);
  const [overlayActive, setOverlayActive] = useState(true);
  const [overlayText, setOverlayText] = useState<string>(
    TAB_META.earthquake.overlayText
  );
  const [refreshing, setRefreshing] = useState(false);

  /* ----- Map / cache refs ----- */
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const activeTabRef = useRef<HazardTab>(activeTab);

  const cacheRef = useRef<{
    earthquake: EarthquakeEvent[];
    wildfire: WildfireEvent[];
    flight: FlightEvent[];
  }>({ earthquake: [], wildfire: [], flight: [] });

  const loadedRef = useRef<Record<HazardTab, boolean>>({
    earthquake: false,
    wildfire: false,
    flight: false,
  });

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  /* ----- Map helpers ----- */

  const fitMapToBounds = useCallback((bounds: [number, number][]) => {
    const map = mapRef.current;
    if (!map) return;

    if (bounds.length === 1) {
      map.setView(bounds[0], 5);
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 7 });
    } else {
      map.setView([20, 0], 2);
    }
    requestAnimationFrame(() => map.invalidateSize());
  }, []);

  // Tailwind utility classes used by both popups and the flight marker
  // are written as full literal strings so the JIT picks them up.
  const popupCardCls = "p-3 px-3.5";
  const popupHeadCls =
    "flex items-center gap-2.5 pb-2 mb-2 border-b border-[#1a1f2b]";
  const popupBadgeBase =
    "inline-flex items-center justify-center min-w-[42px] py-1 px-2 rounded-md text-[13px] font-extrabold tracking-[0.4px] text-[#0a0d14]";
  const popupTitleCls =
    "text-[12.5px] font-semibold text-[#e6e9ef] leading-[1.35] flex-1 min-w-0";
  const popupRowsCls =
    "grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-[5px] text-[11.5px] m-0";
  const popupDtCls =
    "text-[#5b6273] font-semibold uppercase text-[10px] tracking-[0.8px] self-center";
  const popupDdCls = "text-[#e6e9ef] m-0";

  const renderEarthquakes = useCallback(
    (events: EarthquakeEvent[], opts: { refit?: boolean } = {}) => {
      const { refit = true } = opts;
      const L = window.L;
      const layer = layerRef.current;
      if (!L || !layer) return;

      layer.clearLayers();
      const bounds: [number, number][] = [];

      events.forEach((eq) => {
        const coords = eq.coordinates;
        if (!coords || coords.length < 2) return;

        const lat = coords[1];
        const lng = coords[0];
        const mag = eq.magnitude ?? 0;
        const color = earthquakeColor(mag);

        const marker = L.circleMarker([lat, lng], {
          radius: earthquakeMarkerRadius(mag),
          color,
          fillColor: color,
          fillOpacity: 0.85,
          weight: 1,
          opacity: 1,
        });

        const felt = eq.felt != null ? formatNumber(eq.felt) : "\u2014";
        const cdi = eq.cdi != null ? eq.cdi : "\u2014";
        const depth =
          coords[2] != null
            ? `${Number(coords[2]).toFixed(1)} km`
            : "\u2014";

        const html = `
          <div class="${popupCardCls}">
            <div class="${popupHeadCls}">
              <span class="${popupBadgeBase}" style="background:${color};">M ${mag.toFixed(
          1
        )}</span>
              <div class="${popupTitleCls}">${escapeHtml(
          eq.place || "Unknown location"
        )}</div>
            </div>
            <dl class="${popupRowsCls}">
              <dt class="${popupDtCls}">Depth</dt><dd class="${popupDdCls}">${escapeHtml(
          depth
        )}</dd>
              <dt class="${popupDtCls}">Felt</dt><dd class="${popupDdCls}">${escapeHtml(
          felt
        )}</dd>
              <dt class="${popupDtCls}">CDI</dt><dd class="${popupDdCls}">${escapeHtml(
          cdi
        )}</dd>
              <dt class="${popupDtCls}">Time</dt><dd class="${popupDdCls}">${escapeHtml(
          formatEarthquakeTime(eq.time)
        )}</dd>
            </dl>
          </div>`;

        marker.bindPopup(html, { maxWidth: 280 });
        marker.addTo(layer);
        bounds.push([lat, lng]);
      });

      if (refit) fitMapToBounds(bounds);
    },
    [fitMapToBounds]
  );

  const renderWildfires = useCallback(
    (events: WildfireEvent[], opts: { refit?: boolean } = {}) => {
      const { refit = true } = opts;
      const L = window.L;
      const layer = layerRef.current;
      if (!L || !layer) return;

      layer.clearLayers();
      const bounds: [number, number][] = [];

      events.forEach((wf) => {
        const coords = wf.coordinates;
        if (!coords || coords.length < 2) return;

        const lat = coords[1];
        const lng = coords[0];

        const marker = L.circleMarker([lat, lng], {
          radius: 3,
          color: "#facc15",
          fillColor: "#facc15",
          fillOpacity: 0.9,
          weight: 0.5,
          opacity: 1,
        });

        const sizeStr =
          wf.magnitudeValue != null
            ? `${formatNumber(wf.magnitudeValue)} ${
                wf.magnitudeUnit || ""
              }`.trim()
            : "\u2014";
        const desc = wf.description ? stripTags(wf.description) : "";

        const wfBadge =
          "inline-flex items-center justify-center min-w-0 py-1 px-1.5 rounded-md text-[13px] font-extrabold tracking-[0.4px] text-[#1a0d04] bg-[linear-gradient(135deg,#fbbf24,#ef4444)]";

        const html = `
          <div class="${popupCardCls}">
            <div class="${popupHeadCls}">
              <span class="${wfBadge}" aria-hidden="true">\uD83D\uDD25</span>
              <div class="${popupTitleCls}">${escapeHtml(
          wf.title || "Wildfire"
        )}</div>
            </div>
            <dl class="${popupRowsCls}">
              <dt class="${popupDtCls}">Size</dt><dd class="${popupDdCls}">${escapeHtml(
          sizeStr
        )}</dd>
              <dt class="${popupDtCls}">Source</dt><dd class="${popupDdCls}">${escapeHtml(
          wf.source || "\u2014"
        )}</dd>
              <dt class="${popupDtCls}">Updated</dt><dd class="${popupDdCls}">${escapeHtml(
          formatWildfireDate(wf.date)
        )}</dd>
              ${
                desc
                  ? `<dt class="${popupDtCls}">Details</dt><dd class="${popupDdCls}">${escapeHtml(
                      desc
                    )}</dd>`
                  : ""
              }
            </dl>
          </div>`;

        marker.bindPopup(html, { maxWidth: 300 });
        marker.addTo(layer);
        bounds.push([lat, lng]);
      });

      if (refit) fitMapToBounds(bounds);
    },
    [fitMapToBounds]
  );

  const renderFlights = useCallback(
    (events: FlightEvent[], opts: { refit?: boolean } = {}) => {
      const { refit = true } = opts;
      const L = window.L;
      const layer = layerRef.current;
      const map = mapRef.current;
      if (!L || !layer) return;

      layer.clearLayers();
      const bounds: [number, number][] = [];

      const flBadge =
        "inline-flex items-center justify-center min-w-0 py-1 px-2 rounded-md text-[11px] font-extrabold tracking-[0.8px] text-[#0a0d14] bg-[linear-gradient(135deg,#a78bfa,#8b5cf6)]";

      events.forEach((flight) => {
        if (flight.latitude == null || flight.longitude == null) return;

        const lat = flight.latitude;
        const lng = flight.longitude;
        const heading =
          flight.true_track != null && !isNaN(flight.true_track)
            ? flight.true_track
            : 0;

        const markerCls = flight.on_ground
          ? "w-[18px] h-[18px] block pointer-events-auto will-change-transform transition-transform duration-200 ease-linear text-[#94a3b8] opacity-85"
          : "w-[18px] h-[18px] block pointer-events-auto will-change-transform transition-transform duration-200 ease-linear text-[#a78bfa] [filter:drop-shadow(0_0_4px_rgba(167,139,250,0.55))]";

        const iconHtml = `
          <div class="${markerCls}" style="transform: rotate(${heading}deg);">
            <svg viewBox="0 0 24 24" class="w-full h-full fill-current block">
              <path d="${PLANE_SVG_PATH}"/>
            </svg>
          </div>`;

        const icon = L.divIcon({
          html: iconHtml,
          // override Leaflet's default .leaflet-div-icon background/border
          className: "!bg-transparent !border-0",
          iconSize: [18, 18],
          iconAnchor: [9, 9],
          popupAnchor: [0, -8],
        });

        const marker = L.marker([lat, lng], { icon, keyboard: false });

        const callsign = (flight.callsign || "").trim() || "Unknown";
        const status = flight.on_ground ? "On ground" : "Airborne";
        const vRate =
          flight.vertical_rate != null
            ? `${flight.vertical_rate > 0 ? "+" : ""}${flight.vertical_rate.toFixed(
                1
              )} m/s`
            : "\u2014";

        const html = `
          <div class="${popupCardCls}">
            <div class="${popupHeadCls}">
              <span class="${flBadge}">${escapeHtml(callsign)}</span>
              <div class="${popupTitleCls}">${escapeHtml(
          flight.origin_country || "Unknown origin"
        )}</div>
            </div>
            <dl class="${popupRowsCls}">
              <dt class="${popupDtCls}">Status</dt><dd class="${popupDdCls}">${escapeHtml(
          status
        )}</dd>
              <dt class="${popupDtCls}">Altitude</dt><dd class="${popupDdCls}">${escapeHtml(
          formatAltitude(flight.geo_altitude)
        )}</dd>
              <dt class="${popupDtCls}">Speed</dt><dd class="${popupDdCls}">${escapeHtml(
          formatVelocity(flight.velocity)
        )}</dd>
              <dt class="${popupDtCls}">Heading</dt><dd class="${popupDdCls}">${escapeHtml(
          formatHeading(flight.true_track)
        )}</dd>
              <dt class="${popupDtCls}">V/Rate</dt><dd class="${popupDdCls}">${escapeHtml(
          vRate
        )}</dd>
              <dt class="${popupDtCls}">Seen</dt><dd class="${popupDdCls}">${escapeHtml(
          formatFlightTime(flight.time_position)
        )}</dd>
            </dl>
          </div>`;

        marker.bindPopup(html, { maxWidth: 280 });
        marker.addTo(layer);
        bounds.push([lat, lng]);
      });

      if (refit) {
        if (bounds.length === 0 && map) {
          map.fitBounds(INDIA_BOUNDS, { padding: [30, 30] });
          requestAnimationFrame(() => map.invalidateSize());
        } else {
          fitMapToBounds(bounds);
        }
      }
    },
    [fitMapToBounds]
  );

  /* ----- Orchestration ----- */

  const displayCached = useCallback(
    (tab: HazardTab, opts: { refit?: boolean } = {}) => {
      const meta = TAB_META[tab];
      const list = cacheRef.current[tab] || [];

      if (tab === "earthquake") {
        renderEarthquakes(list as EarthquakeEvent[], opts);
      } else if (tab === "wildfire") {
        renderWildfires(list as WildfireEvent[], opts);
      } else {
        renderFlights(list as FlightEvent[], opts);
      }

      setHazardCount(String(list.length));
      setHazardError(false);
      setHazardStatus(
        list.length
          ? `${list.length} ${meta.eventLabel}${
              list.length === 1 ? "" : "s"
            } loaded`
          : meta.empty
      );
    },
    [renderEarthquakes, renderWildfires, renderFlights]
  );

  const loadHazardTab = useCallback(
    // `silent` = background refresh: no overlay, no flicker, keep old
    // markers visible until the new ones replace them, and swallow
    // transient errors so we don't disrupt the user's view.
    async (tab: HazardTab, force = false, silent = false) => {
      const meta = TAB_META[tab];
      const isActive = activeTabRef.current === tab;

      if (loadedRef.current[tab] && !force) {
        if (isActive) displayCached(tab);
        return;
      }

      if (isActive && !silent) {
        setOverlayText(meta.overlayText);
        setOverlayActive(true);
        setHazardStatus(meta.loading);
        setHazardError(false);
        setHazardCount("\u2026");
        layerRef.current?.clearLayers();
      }

      try {
        const res = await fetch(meta.endpoint);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const list = Array.isArray(data) ? data : [];

        cacheRef.current[tab] = list as never;
        loadedRef.current[tab] = true;

        // On silent background refreshes, update markers but DON'T
        // refit the map view — that would yank the user's pan/zoom.
        if (activeTabRef.current === tab) {
          displayCached(tab, { refit: !silent });
        }
      } catch (err) {
        console.error(err);
        if (activeTabRef.current === tab && !silent) {
          setHazardCount("\u2014");
          setHazardStatus(meta.fail);
          setHazardError(true);
          layerRef.current?.clearLayers();
        }
      } finally {
        if (activeTabRef.current === tab && !silent) setOverlayActive(false);
      }
    },
    [displayCached]
  );

  const switchTab = useCallback(
    (tab: HazardTab) => {
      if (tab === activeTabRef.current) return;

      activeTabRef.current = tab;
      setActiveTab(tab);
      layerRef.current?.clearLayers();

      if (loadedRef.current[tab]) {
        displayCached(tab);
        requestAnimationFrame(() => mapRef.current?.invalidateSize());
      } else {
        loadHazardTab(tab);
      }
    },
    [displayCached, loadHazardTab]
  );

  /* ----- Flights tab: silent polling every 15s ----- */

  useEffect(() => {
    if (activeTab !== "flight") return;

    // Fire one silent refresh right away so the user sees fresh data
    // immediately on entering the tab, then poll every 15s silently.
    // If switchTab just kicked off a (non-silent) initial load with the
    // overlay, this background refresh just keeps data fresh without
    // flashing the overlay again.
    loadHazardTab("flight", true, true);
    const interval = setInterval(
      () => loadHazardTab("flight", true, true),
      15000
    );
    return () => clearInterval(interval);
  }, [activeTab, loadHazardTab]);

  /* ----- Mount: init map + initial loads ----- */

  useEffect(() => {
    let cancelled = false;

    loadLeaflet()
      .then((L: any) => {
        if (cancelled || !mapElRef.current || mapRef.current) return;

        const map = L.map(mapElRef.current, {
          center: [20, 0],
          zoom: 2,
          minZoom: 2,
          worldCopyJump: true,
          zoomControl: true,
        });

        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: "abcd",
            maxZoom: 19,
          }
        ).addTo(map);

        mapRef.current = map;
        layerRef.current = L.layerGroup().addTo(map);

        loadHazardTab(activeTabRef.current);
      })
      .catch((err) => {
        console.error(err);
        setHazardStatus("Failed to load map library.");
        setHazardError(true);
        setOverlayActive(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFeeds = useCallback(async () => {
    setFeeds(null);
    setFeedsError(false);
    try {
      const res = await fetch("/feeds");
      const data = await res.json();
      setFeeds(Array.isArray(data?.feeds) ? data.feeds : []);
    } catch (err) {
      console.error(err);
      setFeedsError(true);
      setFeeds([]);
    }
  }, []);

  useEffect(() => {
    loadFeeds();
  }, [loadFeeds]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadFeeds(),
        loadHazardTab(activeTabRef.current, true),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [loadFeeds, loadHazardTab]);

  /* ----- Derived render data ----- */

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

  const meta = TAB_META[activeTab];

  return (
    <>
      {/* React 19 hoists these into <head> automatically. */}
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
          // Base background color + two radial gradient overlays
          "bg-[#0a0d14]",
          "bg-[radial-gradient(1200px_600px_at_10%_-10%,rgba(56,189,248,0.06),transparent_60%),radial-gradient(1000px_500px_at_110%_0%,rgba(249,115,22,0.05),transparent_60%)]",
        ].join(" ")}
      >
        {/* ===== Top bar ===== */}
        <header className="flex items-center justify-between mb-[18px] px-1 pt-1.5 pb-3.5 border-b border-[#1a1f2b]">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] shadow-[0_0_10px_#22c55e]" />
            <h1 className="text-lg tracking-[3px] font-bold m-0">
              VISION
            </h1>
            <span className="text-[#5b6273] text-xs tracking-[1px] ml-1.5 max-[640px]:hidden">
              Live News Intelligence
            </span>
          </div>
          <div className="flex items-center">
            <button
              type="button"
              onClick={handleRefresh}
              className="bg-[#161b27] text-[#e6e9ef] border border-[#1f2533] py-[7px] px-3.5 rounded-md cursor-pointer text-xs flex items-center gap-1.5 transition-[color,border-color] duration-200 hover:border-[#22c55e] hover:text-[#22c55e]"
            >
              <span
                className={`text-sm inline-block ${
                  refreshing ? "animate-spin" : ""
                }`}
              >
                {"\u21bb"}
              </span>{" "}
              Refresh
            </button>
          </div>
        </header>

        <main>
          {/* ===== Hazard panel ===== */}
          <section
            className={[
              "relative overflow-hidden rounded-[10px] border border-[#1f2533] mb-[18px]",
              "shadow-[0_8px_24px_rgba(0,0,0,0.35)]",
              "transition-[background,border-color] duration-300",
              "before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-0.5 before:opacity-90 before:z-2 before:transition-[background] before:duration-300",
              PANEL_BG[activeTab],
              ACCENT_BAR[activeTab],
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-3 py-3.5 px-4 pb-3 border-b border-[#1a1f2b]">
              <div className="min-w-0 flex-1">
                <nav
                  className="inline-flex gap-1 p-1 mb-2 bg-[#0f131c] border border-[#1a1f2b] rounded-lg"
                  role="tablist"
                  aria-label="Map layers"
                >
                  {HAZARD_TABS.map((tab) => {
                    const isActive = activeTab === tab;
                    return (
                      <button
                        key={tab}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        aria-controls="hazard-map"
                        onClick={() => switchTab(tab)}
                        className={[
                          "inline-flex items-center gap-2 py-[7px] px-3.5 max-[640px]:px-2.5 rounded-md cursor-pointer",
                          "text-[11px] font-bold tracking-[1.2px] uppercase",
                          "border transition-[color,background,border-color,box-shadow] duration-180",
                          isActive
                            ? TAB_ACTIVE[tab]
                            : "bg-transparent border-transparent text-[#8a93a6] hover:text-[#e6e9ef] hover:bg-white/2.5",
                        ].join(" ")}
                      >
                        <TabIcon tab={tab} />
                        <span className="max-[640px]:hidden">
                          {TAB_LABEL[tab]}
                        </span>
                      </button>
                    );
                  })}
                </nav>
                <p className="text-[#5b6273] text-[11px] leading-[1.4] tracking-[0.3px] m-0">
                  {meta.subtitle}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-[1px] py-0.5 px-1.5 rounded-[3px] bg-[rgba(34,197,94,0.15)] text-[#22c55e] border border-[rgba(34,197,94,0.35)] before:content-[''] before:w-[5px] before:h-[5px] before:rounded-full before:bg-[#22c55e] before:shadow-[0_0_6px_#22c55e] before:animate-pulse">
                  LIVE
                </span>
                <span className="text-[10px] font-semibold text-[#8a93a6] py-0.5 px-[7px] rounded-[10px] bg-[#161b27] border border-[#1f2533] min-w-[22px] text-center">
                  {hazardCount}
                </span>
              </div>
            </div>

            {/* Map + overlays. Leaflet's own DOM is restyled via arbitrary variants. */}
            <div
              className={[
                "relative",
                // Leaflet container + tiles
                "[&_.leaflet-container]:bg-[#0f131c] [&_.leaflet-container]:font-[inherit]",
                // Zoom controls
                "[&_.leaflet-control-zoom_a]:bg-[#161b27]! [&_.leaflet-control-zoom_a]:text-[#e6e9ef]! [&_.leaflet-control-zoom_a]:border! [&_.leaflet-control-zoom_a]:border-[#1f2533]!",
                "[&_.leaflet-control-zoom_a:hover]:bg-[#1b2230]!",
                // Attribution
                "[&_.leaflet-control-attribution]:bg-[rgba(15,19,28,0.8)]! [&_.leaflet-control-attribution]:text-[#5b6273]!",
                "[&_.leaflet-control-attribution_a]:text-[#8a93a6]!",
                // Popup wrapper + tip
                "[&_.leaflet-popup-content-wrapper]:bg-[#161b27]! [&_.leaflet-popup-content-wrapper]:text-[#e6e9ef]!",
                "[&_.leaflet-popup-content-wrapper]:border! [&_.leaflet-popup-content-wrapper]:border-[#1f2533]!",
                "[&_.leaflet-popup-content-wrapper]:shadow-[0_12px_32px_rgba(0,0,0,0.6)]!",
                "[&_.leaflet-popup-tip]:bg-[#161b27]! [&_.leaflet-popup-tip]:border! [&_.leaflet-popup-tip]:border-[#1f2533]!",
                "[&_.leaflet-popup-content]:m-0! [&_.leaflet-popup-content]:text-xs! [&_.leaflet-popup-content]:leading-normal! [&_.leaflet-popup-content]:min-w-[200px]!",
                // Close button
                "[&_.leaflet-popup-close-button]:text-[#5b6273]! [&_.leaflet-popup-close-button]:pt-1.5! [&_.leaflet-popup-close-button]:pr-2!",
                "[&_.leaflet-popup-close-button:hover]:text-[#e6e9ef]!",
              ].join(" ")}
            >
              <div
                ref={mapElRef}
                id="hazard-map"
                role="tabpanel"
                aria-label="Hazard map"
                className="h-[420px] max-[640px]:h-[320px] w-full bg-[#0f131c] z-0"
              />

              {/* Loading overlay */}
              <div
                aria-hidden={!overlayActive}
                className={[
                  "absolute inset-0 flex flex-col items-center justify-center gap-3.5 z-500",
                  "bg-[rgba(10,13,20,0.72)] backdrop-blur-[2px]",
                  "transition-opacity duration-250",
                  overlayActive
                    ? "opacity-100 pointer-events-auto"
                    : "opacity-0 pointer-events-none",
                ].join(" ")}
              >
                <div
                  role="status"
                  aria-live="polite"
                  className={`relative w-[52px] h-[52px] ${SPINNER_COLOR[activeTab]}`}
                >
                  <div className="absolute inset-0 border-2 border-transparent rounded-full border-t-current animate-[spin_1.1s_linear_infinite]" />
                  <div className="absolute inset-[7px] border-2 border-transparent rounded-full border-r-current opacity-70 animate-[spin_1.6s_linear_infinite_reverse]" />
                  <div className="absolute inset-[14px] border-2 border-transparent rounded-full border-b-current opacity-40 animate-[spin_2.1s_linear_infinite]" />
                </div>
                <div className="text-[11px] font-bold tracking-[2px] uppercase text-[#8a93a6]">
                  {overlayText}
                </div>
              </div>

              {/* Legend */}
              <div
                aria-hidden="true"
                className="absolute left-3 bottom-3 z-400 flex flex-col gap-1.5 max-w-[260px] py-2 px-2.5 rounded-lg border border-[#1f2533] bg-[rgba(15,19,28,0.85)] backdrop-blur-md text-[10px] text-[#8a93a6] pointer-events-none select-none"
              >
                {activeTab === "earthquake" ? (
                  <div>
                    <div className="text-[9px] font-bold tracking-[1.4px] uppercase text-[#5b6273] mb-[3px]">
                      Magnitude
                    </div>
                    <div className="flex items-center flex-wrap gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#a3e635] text-[#a3e635] shadow-[0_0_6px_currentColor]" />
                      <span className="mr-1.5 text-[#e6e9ef]">
                        {"2.5\u20133.9"}
                      </span>
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#eab308] text-[#eab308] shadow-[0_0_6px_currentColor]" />
                      <span className="mr-1.5 text-[#e6e9ef]">
                        {"4\u20134.9"}
                      </span>
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#f97316] text-[#f97316] shadow-[0_0_6px_currentColor]" />
                      <span className="mr-1.5 text-[#e6e9ef]">
                        {"5\u20135.9"}
                      </span>
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#ef4444] text-[#ef4444] shadow-[0_0_6px_currentColor]" />
                      <span className="mr-1.5 text-[#e6e9ef]">6+</span>
                    </div>
                  </div>
                ) : null}

                {activeTab === "wildfire" ? (
                  <div>
                    <div className="text-[9px] font-bold tracking-[1.4px] uppercase text-[#5b6273] mb-[3px]">
                      Active wildfire
                    </div>
                    <div className="flex items-center flex-wrap gap-1.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#facc15] shadow-[0_0_4px_rgba(250,204,21,0.5)]" />
                      <span className="mr-1.5 text-[#e6e9ef]">
                        Open event
                      </span>
                    </div>
                  </div>
                ) : null}

                {activeTab === "flight" ? (
                  <div>
                    <div className="text-[9px] font-bold tracking-[1.4px] uppercase text-[#5b6273] mb-[3px]">
                      {"Live flights \u00b7 India"}
                    </div>
                    <div className="flex items-center flex-wrap gap-1.5">
                      <svg
                        viewBox="0 0 24 24"
                        className="inline-block w-2.5 h-2.5 fill-[#a78bfa] filter-[drop-shadow(0_0_3px_rgba(167,139,250,0.55))]"
                        aria-hidden="true"
                      >
                        <path d={PLANE_SVG_PATH} />
                      </svg>
                      <span className="mr-1.5 text-[#e6e9ef]">Airborne</span>
                      <svg
                        viewBox="0 0 24 24"
                        className="inline-block w-2.5 h-2.5 fill-[#94a3b8]"
                        aria-hidden="true"
                      >
                        <path d={PLANE_SVG_PATH} />
                      </svg>
                      <span className="mr-1.5 text-[#e6e9ef]">On ground</span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Status bar */}
            <div
              className={[
                "flex items-center gap-2 py-2.5 px-4 text-[11px] tracking-[0.3px] border-t border-[#1a1f2b]",
                "before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:shadow-[0_0_4px_currentColor]",
                hazardError
                  ? "text-[#ef4444] before:bg-[#ef4444]"
                  : `text-[#8a93a6] ${STATUS_DOT[activeTab]}`,
              ].join(" ")}
            >
              {hazardStatus}
            </div>
          </section>

          {/* ===== Dashboard grid ===== */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-3.5">
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
                <CategoryCard
                  key={cat}
                  category={cat}
                  items={grouped[cat]}
                />
              ))
            )}
          </div>
        </main>
      </div>
    </>
  );
}