"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { MapLegend } from "@/components/vision/MapLegend";
import {
  ACCENT_BAR,
  HAZARD_TABS,
  PANEL_BG,
  PLANE_SVG_PATH,
  SPINNER_COLOR,
  STATUS_DOT,
  TAB_ACTIVE,
  TAB_LABEL,
  TAB_META,
} from "@/lib/vision/constants";
import {
  earthquakeColor,
  escapeHtml,
  formatAltitude,
  formatEarthquakeTime,
  formatFlightTime,
  formatHeading,
  formatNumber,
  formatVelocity,
  formatWildfireDate,
  stripTags,
} from "@/lib/vision/helpers";
import type {
  EarthquakeEvent,
  FeedItem,
  FlightEvent,
  HazardTab,
  WildfireEvent,
} from "@/lib/vision/types";

// Maps the official ISO country names emitted by the backend (countries.py)
// onto the common names used in public/countries.geojson. Keys are normalized
// (see normalizeCountryName), values are the GeoJSON "name" property.
const COUNTRY_NAME_ALIASES: Record<string, string> = {
  "russian federation": "Russia",
  "korea republic of": "South Korea",
  "korea democratic people s republic of": "North Korea",
  "viet nam": "Vietnam",
  "syrian arab republic": "Syria",
  "iran islamic republic of": "Iran",
  "lao people s democratic republic": "Laos",
  "congo the democratic republic of the": "Democratic Republic of the Congo",
  congo: "Republic of the Congo",
  "tanzania united republic of": "Tanzania",
  "venezuela bolivarian republic of": "Venezuela",
  "moldova republic of": "Moldova",
  "bolivia plurinational state of": "Bolivia",
  "brunei darussalam": "Brunei",
  "united states": "United States of America",
  turkiye: "Turkey",
  "cote d ivoire": "Ivory Coast",
  "palestine state of": "Palestine",
  bahamas: "The Bahamas",
  "taiwan province of china": "Taiwan",
  "micronesia federated states of": "Federated States of Micronesia",
};

function normalizeCountryName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function lookupCountryFeature(
  name: string,
  featureMap: Map<string, any>
): any {
  const norm = normalizeCountryName(name);
  if (featureMap.has(norm)) return featureMap.get(norm);

  const alias = COUNTRY_NAME_ALIASES[norm];
  if (alias) {
    const aliasNorm = normalizeCountryName(alias);
    if (featureMap.has(aliasNorm)) return featureMap.get(aliasNorm);
  }

  const beforeComma = normalizeCountryName(name.split(",")[0]);
  if (beforeComma && featureMap.has(beforeComma)) {
    return featureMap.get(beforeComma);
  }

  return undefined;
}

// ---- Shared popup markup (reused from the old Leaflet popups) ----
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

function buildNewsHtml(group: {
  country: string;
  items: FeedItem[];
}): string {
  const count = group.items.length;
  const newsBadge =
    "inline-flex items-center justify-center min-w-[34px] py-1 px-2 rounded-md text-[12px] font-extrabold tracking-[0.6px] text-[#0a0d14] bg-[linear-gradient(135deg,#4ade80,#22c55e)]";

  const itemsList = group.items
    .slice(0, 12)
    .map(
      (f) => `
      <a href="${escapeHtml(f.link)}" target="_blank" rel="noopener noreferrer"
        class="block py-1.5 border-b border-[#1a1f2b] last:border-b-0 text-inherit no-underline transition-colors hover:text-[#22c55e]">
        <div class="flex items-center gap-1.5 mb-0.5">
          <span class="text-[9px] font-bold tracking-[0.6px] uppercase text-[#8a93a6]">${escapeHtml(
            f.source || ""
          )}</span>
          ${
            f.category
              ? `<span class="text-[9px] text-[#5b6273] tracking-[0.4px]">\u00b7 ${escapeHtml(
                  f.category
                )}</span>`
              : ""
          }
        </div>
        <div class="text-[11.5px] font-medium leading-snug text-[#e6e9ef]">${escapeHtml(
          f.title || ""
        )}</div>
      </a>`
    )
    .join("");

  const moreText =
    group.items.length > 12
      ? `<div class="pt-1.5 text-[10px] text-[#5b6273] tracking-[0.4px]">+${
          group.items.length - 12
        } more</div>`
      : "";

  return `
  <div class="${popupCardCls}">
    <div class="${popupHeadCls}">
      <span class="${newsBadge}">${escapeHtml(String(count))}</span>
      <div class="${popupTitleCls}">${escapeHtml(group.country)}</div>
    </div>
    <div class="m-0">
      ${itemsList}
      ${moreText}
    </div>
  </div>`;
}

function buildEarthquakeHtml(eq: EarthquakeEvent): string {
  const mag = eq.magnitude ?? 0;
  const color = earthquakeColor(mag);
  const felt = eq.felt != null ? formatNumber(eq.felt) : "\u2014";
  const cdi = eq.cdi != null ? eq.cdi : "\u2014";
  const depth =
    eq.coordinates && eq.coordinates[2] != null
      ? `${Number(eq.coordinates[2]).toFixed(1)} km`
      : "\u2014";

  return `
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
}

function buildWildfireHtml(wf: WildfireEvent): string {
  const sizeStr =
    wf.magnitudeValue != null
      ? `${formatNumber(wf.magnitudeValue)} ${wf.magnitudeUnit || ""}`.trim()
      : "\u2014";
  const desc = wf.description ? stripTags(wf.description) : "";
  const wfBadge =
    "inline-flex items-center justify-center min-w-0 py-1 px-1.5 rounded-md text-[13px] font-extrabold tracking-[0.4px] text-[#1a0d04] bg-[linear-gradient(135deg,#fbbf24,#ef4444)]";

  return `
  <div class="${popupCardCls}">
    <div class="${popupHeadCls}">
      <span class="${wfBadge}" aria-hidden="true">\uD83D\uDD25</span>
      <div class="${popupTitleCls}">${escapeHtml(wf.title || "Wildfire")}</div>
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
}

function buildFlightHtml(flight: FlightEvent): string {
  const flBadge =
    "inline-flex items-center justify-center min-w-0 py-1 px-2 rounded-md text-[11px] font-extrabold tracking-[0.8px] text-[#0a0d14] bg-[linear-gradient(135deg,#a78bfa,#8b5cf6)]";
  const callsign = (flight.callsign || "").trim() || "Unknown";
  const status = flight.on_ground ? "On ground" : "Airborne";
  const vRate =
    flight.vertical_rate != null
      ? `${flight.vertical_rate > 0 ? "+" : ""}${flight.vertical_rate.toFixed(
          1
        )} m/s`
      : "\u2014";

  return `
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
}

function tooltip(html: string): string {
  return `<div class="py-1.5 px-2.5 rounded-md bg-[#161b27] border border-[#1f2533] text-[#e6e9ef] text-[11px] font-semibold shadow-[0_8px_24px_rgba(0,0,0,0.5)] whitespace-nowrap">${html}</div>`;
}

function TabIcon({ tab }: { tab: HazardTab }) {
  if (tab === "news") {
    return (
      <svg
        className="w-3.5 h-3.5 shrink-0"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M3 12 H21 M12 3 C15 6.5 15 17.5 12 21 M12 3 C9 6.5 9 17.5 12 21"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }
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

export interface HazardMapHandle {
  refresh: () => Promise<void>;
}

interface HazardMapProps {
  feeds: FeedItem[] | null;
  feedsError: boolean;
}

export const HazardMap = forwardRef<HazardMapHandle, HazardMapProps>(
  function HazardMap({ feeds, feedsError }, ref) {
    const [activeTab, setActiveTab] = useState<HazardTab>("news");
    const [hazardCount, setHazardCount] = useState<string>("\u2014");
    const [hazardStatus, setHazardStatus] = useState<string>(
      TAB_META.news.loading
    );
    const [hazardError, setHazardError] = useState(false);
    const [overlayActive, setOverlayActive] = useState(true);
    const [overlayText, setOverlayText] = useState<string>(
      TAB_META.news.overlayText
    );
    const [mapReady, setMapReady] = useState(false);
    const [geoReady, setGeoReady] = useState(false);

    // Globe render data (declarative, unlike Leaflet's imperative layers).
    const [polygons, setPolygons] = useState<any[]>([]);
    const [points, setPoints] = useState<any[]>([]);
    const [selected, setSelected] = useState<string | null>(null);

    // react-globe.gl is loaded client-side only (it needs WebGL/window).
    const [GlobeComp, setGlobeComp] = useState<any>(null);
    const [dims, setDims] = useState<{ width: number; height: number }>({
      width: 0,
      height: 0,
    });

    const wrapRef = useRef<HTMLDivElement | null>(null);
    const globeRef = useRef<any>(null);
    const activeTabRef = useRef<HazardTab>(activeTab);
    const newsNeedsFitRef = useRef<boolean>(true);
    const countryFeaturesRef = useRef<Map<string, any>>(new Map());

    const cacheRef = useRef<{
      news: FeedItem[];
      earthquake: EarthquakeEvent[];
      wildfire: WildfireEvent[];
      flight: FlightEvent[];
    }>({ news: [], earthquake: [], wildfire: [], flight: [] });

    const loadedRef = useRef<Record<HazardTab, boolean>>({
      news: false,
      earthquake: false,
      wildfire: false,
      flight: false,
    });

    useEffect(() => {
      activeTabRef.current = activeTab;
    }, [activeTab]);

    // Load the globe component on the client only.
    useEffect(() => {
      let on = true;
      import("react-globe.gl").then((mod) => {
        if (on) setGlobeComp(() => mod.default);
      });
      return () => {
        on = false;
      };
    }, []);

    // Keep the globe canvas sized to its container.
    useEffect(() => {
      const el = wrapRef.current;
      if (!el) return;
      const update = () =>
        setDims({ width: el.clientWidth, height: el.clientHeight });
      update();
      const ro = new ResizeObserver(update);
      ro.observe(el);
      return () => ro.disconnect();
    }, [GlobeComp]);

    // Load country boundaries once.
    useEffect(() => {
      let cancelled = false;
      fetch("/countries.geojson")
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((geo) => {
          if (cancelled) return;
          const map = new Map<string, any>();
          for (const feature of geo.features ?? []) {
            const name = feature?.properties?.name;
            if (name) map.set(normalizeCountryName(name), feature);
          }
          countryFeaturesRef.current = map;
          setGeoReady(true);
        })
        .catch((err) => {
          console.error("Failed to load country boundaries", err);
        });
      return () => {
        cancelled = true;
      };
    }, []);

    const flyTo = useCallback((coords: [number, number][]) => {
      const globe = globeRef.current;
      if (!globe) return;
      if (!coords.length) {
        globe.pointOfView({ lat: 20, lng: 20, altitude: 2.4 }, 800);
        return;
      }
      let lat = 0;
      let lng = 0;
      for (const [la, lo] of coords) {
        lat += la;
        lng += lo;
      }
      globe.pointOfView(
        {
          lat: lat / coords.length,
          lng: lng / coords.length,
          altitude: coords.length > 1 ? 1.9 : 1.4,
        },
        800
      );
    }, []);

    const displayCached = useCallback(
      (tab: HazardTab, opts: { refit?: boolean } = {}) => {
        const { refit = true } = opts;
        const meta = TAB_META[tab];
        const coords: [number, number][] = [];

        if (tab === "news") {
          const items = (cacheRef.current.news || []).filter(
            (f) => f.latitude != null && f.longitude != null
          );

          const groups = new Map<
            string,
            { lat: number; lng: number; country: string; items: FeedItem[] }
          >();
          for (const item of items) {
            const key = `${item.latitude!.toFixed(3)},${item.longitude!.toFixed(
              3
            )}`;
            const countryName =
              Array.isArray(item.country) && item.country.length
                ? item.country[item.country.length - 1]
                : "Unknown";
            const existing = groups.get(key);
            if (existing) existing.items.push(item);
            else
              groups.set(key, {
                lat: item.latitude!,
                lng: item.longitude!,
                country: countryName,
                items: [item],
              });
          }

          const polys: any[] = [];
          const pts: any[] = [];
          groups.forEach((group) => {
            coords.push([group.lat, group.lng]);
            const count = group.items.length;
            const feature = lookupCountryFeature(
              group.country,
              countryFeaturesRef.current
            );
            const intensity = Math.min(0.6, 0.16 + Math.log2(count + 1) * 0.08);
            const detailHtml = buildNewsHtml(group);

            if (feature) {
              polys.push({
                ...feature,
                __country: group.country,
                __count: count,
                __capColor: `rgba(34,197,94,${intensity})`,
                __altitude: 0.01 + Math.min(0.18, Math.log2(count + 1) * 0.02),
                __label: tooltip(
                  `${escapeHtml(group.country)} \u00b7 ${count} ${
                    count === 1 ? "story" : "stories"
                  }`
                ),
                __detailHtml: detailHtml,
              });
            } else {
              // Fallback dot for countries with no boundary in the GeoJSON.
              pts.push({
                lat: group.lat,
                lng: group.lng,
                color: "#22c55e",
                radius: Math.min(0.6, 0.25 + Math.log2(count + 1) * 0.08),
                altitude: 0.01,
                label: tooltip(
                  `${escapeHtml(group.country)} \u00b7 ${count} ${
                    count === 1 ? "story" : "stories"
                  }`
                ),
                detailHtml,
              });
            }
          });

          setPolygons(polys);
          setPoints(pts);
          setHazardCount(String(items.length));
          setHazardError(feedsError);
          setHazardStatus(
            feedsError
              ? meta.fail
              : items.length
              ? `${items.length} ${
                  items.length === 1 ? meta.eventLabel : meta.eventLabelPlural
                } mapped`
              : meta.empty
          );
        } else if (tab === "earthquake") {
          const list = cacheRef.current.earthquake || [];
          const pts = list
            .filter((eq) => eq.coordinates && eq.coordinates.length >= 2)
            .map((eq) => {
              const lat = eq.coordinates[1];
              const lng = eq.coordinates[0];
              const mag = eq.magnitude ?? 0;
              coords.push([lat, lng]);
              return {
                lat,
                lng,
                color: earthquakeColor(mag),
                radius: Math.min(0.7, 0.2 + Math.max(0, mag - 2.5) * 0.12),
                altitude: Math.min(0.5, 0.02 + Math.max(0, mag - 2.5) * 0.04),
                label: tooltip(
                  `M ${mag.toFixed(1)} \u00b7 ${escapeHtml(
                    eq.place || "Unknown"
                  )}`
                ),
                detailHtml: buildEarthquakeHtml(eq),
              };
            });
          setPolygons([]);
          setPoints(pts);
          setHazardCount(String(list.length));
          setHazardError(false);
          setHazardStatus(
            list.length
              ? `${list.length} ${
                  list.length === 1 ? meta.eventLabel : meta.eventLabelPlural
                } loaded`
              : meta.empty
          );
        } else if (tab === "wildfire") {
          const list = cacheRef.current.wildfire || [];
          const pts = list
            .filter((wf) => wf.coordinates && wf.coordinates.length >= 2)
            .map((wf) => {
              const lat = wf.coordinates[1];
              const lng = wf.coordinates[0];
              coords.push([lat, lng]);
              return {
                lat,
                lng,
                color: "#facc15",
                radius: 0.28,
                altitude: 0.01,
                label: tooltip(`\uD83D\uDD25 ${escapeHtml(wf.title || "Wildfire")}`),
                detailHtml: buildWildfireHtml(wf),
              };
            });
          setPolygons([]);
          setPoints(pts);
          setHazardCount(String(list.length));
          setHazardError(false);
          setHazardStatus(
            list.length
              ? `${list.length} ${
                  list.length === 1 ? meta.eventLabel : meta.eventLabelPlural
                } loaded`
              : meta.empty
          );
        } else {
          const list = cacheRef.current.flight || [];
          const pts = list
            .filter((fl) => fl.latitude != null && fl.longitude != null)
            .map((fl) => {
              coords.push([fl.latitude, fl.longitude]);
              return {
                lat: fl.latitude,
                lng: fl.longitude,
                color: fl.on_ground ? "#94a3b8" : "#a78bfa",
                radius: 0.22,
                altitude: fl.on_ground
                  ? 0.005
                  : Math.min(0.25, 0.02 + (fl.geo_altitude ?? 0) / 60000),
                label: tooltip(
                  `${escapeHtml((fl.callsign || "").trim() || "Unknown")} \u00b7 ${
                    fl.on_ground ? "On ground" : "Airborne"
                  }`
                ),
                detailHtml: buildFlightHtml(fl),
              };
            });
          setPolygons([]);
          setPoints(pts);
          setHazardCount(String(list.length));
          setHazardError(false);
          setHazardStatus(
            list.length
              ? `${list.length} ${
                  list.length === 1 ? meta.eventLabel : meta.eventLabelPlural
                } loaded`
              : meta.empty
          );
        }

        if (refit && mapReady) flyTo(coords);
      },
      [feedsError, mapReady, flyTo]
    );

    const loadHazardTab = useCallback(
      async (tab: HazardTab, force = false, silent = false) => {
        if (tab === "news") return;

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
        }

        try {
          const res = await fetch(meta.endpoint);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          const list = Array.isArray(data) ? data : [];
          cacheRef.current[tab] = list as never;
          loadedRef.current[tab] = true;

          if (activeTabRef.current === tab) {
            displayCached(tab, { refit: !silent });
          }
        } catch (err) {
          console.error(err);
          if (activeTabRef.current === tab && !silent) {
            setHazardCount("\u2014");
            setHazardStatus(meta.fail);
            setHazardError(true);
            setPolygons([]);
            setPoints([]);
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
        setSelected(null);
        setPolygons([]);
        setPoints([]);

        if (tab === "news") {
          newsNeedsFitRef.current = true;
          displayCached("news");
          return;
        }

        if (loadedRef.current[tab]) displayCached(tab);
        else loadHazardTab(tab);
      },
      [displayCached, loadHazardTab]
    );

    useImperativeHandle(
      ref,
      () => ({
        refresh: () => loadHazardTab(activeTabRef.current, true),
      }),
      [loadHazardTab]
    );

    // Live flight polling.
    useEffect(() => {
      if (activeTab !== "flight") return;
      loadHazardTab("flight", true, true);
      const interval = setInterval(
        () => loadHazardTab("flight", true, true),
        15000
      );
      return () => clearInterval(interval);
    }, [activeTab, loadHazardTab]);

    // Render/refresh news whenever feeds or boundaries change.
    useEffect(() => {
      if (feeds === null) {
        if (activeTab === "news") {
          setOverlayText(TAB_META.news.overlayText);
          setOverlayActive(true);
          setHazardStatus(TAB_META.news.loading);
          setHazardError(false);
          setHazardCount("\u2026");
        }
        return;
      }

      cacheRef.current.news = feeds.filter(
        (f) => f.latitude != null && f.longitude != null
      );
      loadedRef.current.news = true;

      if (activeTab !== "news") return;

      const refit = newsNeedsFitRef.current;
      newsNeedsFitRef.current = false;
      displayCached("news", { refit });
      setOverlayActive(false);
    }, [feeds, activeTab, geoReady, displayCached]);

    const meta = TAB_META[activeTab];

    return (
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
                    aria-controls="hazard-globe"
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
                    <span className="max-[640px]:hidden">{TAB_LABEL[tab]}</span>
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

        <div className="relative">
          <div
            ref={wrapRef}
            id="hazard-globe"
            role="tabpanel"
            aria-label="Hazard globe"
            onMouseEnter={() => {
              const controls = globeRef.current?.controls?.();
              if (controls) controls.autoRotate = false;
            }}
            onMouseLeave={() => {
              const controls = globeRef.current?.controls?.();
              if (controls) controls.autoRotate = true;
            }}
            className="h-[420px] max-[640px]:h-[320px] w-full bg-[#0f131c] overflow-hidden z-0"
          >
            {GlobeComp && dims.width > 0 ? (
              <GlobeComp
                ref={globeRef}
                width={dims.width}
                height={dims.height}
                backgroundColor="rgba(0,0,0,0)"
                globeImageUrl="https://unpkg.com/three-globe/example/img/earth-night.jpg"
                bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
                showAtmosphere
                atmosphereColor="#38bdf8"
                atmosphereAltitude={0.18}
                onGlobeReady={() => {
                  setMapReady(true);
                  const controls = globeRef.current?.controls?.();
                  if (controls) {
                    controls.autoRotate = true;
                    controls.autoRotateSpeed = 0.25;
                    controls.enableDamping = true;
                  }
                  globeRef.current?.pointOfView({
                    lat: 20,
                    lng: 30,
                    altitude: 2.4,
                  });
                }}
                onGlobeClick={() => setSelected(null)}
                polygonsData={polygons}
                polygonAltitude={(d: any) => d.__altitude}
                polygonCapColor={(d: any) => d.__capColor}
                polygonSideColor={() => "rgba(34,197,94,0.12)"}
                polygonStrokeColor={() => "#22c55e"}
                polygonLabel={(d: any) => d.__label}
                onPolygonClick={(d: any) => setSelected(d.__detailHtml)}
                polygonsTransitionDuration={300}
                pointsData={points}
                pointLat={(d: any) => d.lat}
                pointLng={(d: any) => d.lng}
                pointColor={(d: any) => d.color}
                pointAltitude={(d: any) => d.altitude}
                pointRadius={(d: any) => d.radius}
                pointLabel={(d: any) => d.label}
                onPointClick={(d: any) => setSelected(d.detailHtml)}
                pointsTransitionDuration={0}
              />
            ) : null}
          </div>

          {selected ? (
            <div className="absolute top-3 right-3 z-600 w-[320px] max-w-[calc(100%-24px)] max-h-[calc(100%-24px)] overflow-y-auto rounded-lg border border-[#1f2533] bg-[#161b27] shadow-[0_12px_32px_rgba(0,0,0,0.6)] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#232a3a] [&::-webkit-scrollbar-thumb]:rounded-[2px]">
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close details"
                className="absolute top-1.5 right-2 z-10 text-[#5b6273] hover:text-[#e6e9ef] text-base leading-none cursor-pointer"
              >
                {"\u00d7"}
              </button>
              <div dangerouslySetInnerHTML={{ __html: selected }} />
            </div>
          ) : null}

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

          <MapLegend activeTab={activeTab} />
        </div>

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
    );
  }
);
