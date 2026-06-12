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
  INDIA_BOUNDS,
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
  earthquakeMarkerRadius,
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
import { loadLeaflet } from "@/lib/vision/leaflet";
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
  featureMap: Map<string, unknown>
): unknown {
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

    const mapElRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<any>(null);
    const layerRef = useRef<any>(null);
    const activeTabRef = useRef<HazardTab>(activeTab);
    const newsNeedsFitRef = useRef<boolean>(true);
    const countryFeaturesRef = useRef<Map<string, unknown>>(new Map());

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

    // Load country boundaries once for the news choropleth.
    useEffect(() => {
      let cancelled = false;
      fetch("/countries.geojson")
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((geo) => {
          if (cancelled) return;
          const map = new Map<string, unknown>();
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

    const renderNews = useCallback(
      (items: FeedItem[], opts: { refit?: boolean } = {}) => {
        const { refit = true } = opts;
        const L = window.L;
        const layer = layerRef.current;
        if (!L || !layer) return;

        layer.clearLayers();
        const bounds: [number, number][] = [];

        // Group every story by its (last) matched country so each country gets
        // a single choropleth polygon shaded by story volume.
        const groups = new Map<
          string,
          { lat: number | null; lng: number | null; items: FeedItem[] }
        >();

        for (const item of items) {
          const countryName =
            Array.isArray(item.country) && item.country.length
              ? item.country[item.country.length - 1]
              : "Unknown";

          const existing = groups.get(countryName);
          if (existing) {
            existing.items.push(item);
            if (existing.lat == null && item.latitude != null) {
              existing.lat = item.latitude;
              existing.lng = item.longitude ?? null;
            }
          } else {
            groups.set(countryName, {
              lat: item.latitude ?? null,
              lng: item.longitude ?? null,
              items: [item],
            });
          }
        }

        const newsBadge =
          "inline-flex items-center justify-center min-w-[34px] py-1 px-2 rounded-md text-[12px] font-extrabold tracking-[0.6px] text-[#0a0d14] bg-[linear-gradient(135deg,#4ade80,#22c55e)]";

        groups.forEach((group, country) => {
          const count = group.items.length;

          const itemsList = group.items
            .slice(0, 6)
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
            group.items.length > 6
              ? `<div class="pt-1.5 text-[10px] text-[#5b6273] tracking-[0.4px]">+${
                  group.items.length - 6
                } more</div>`
              : "";

          const html = `
          <div class="${popupCardCls}">
            <div class="${popupHeadCls}">
              <span class="${newsBadge}">${escapeHtml(String(count))}</span>
              <div class="${popupTitleCls}">${escapeHtml(country)}</div>
            </div>
            <div class="m-0 max-h-[240px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#232a3a] [&::-webkit-scrollbar-thumb]:rounded-[2px]">
              ${itemsList}
              ${moreText}
            </div>
          </div>`;

          const tooltip = `${escapeHtml(country)} \u00b7 ${count} ${
            count === 1 ? "story" : "stories"
          }`;

          const feature = lookupCountryFeature(
            country,
            countryFeaturesRef.current
          );

          if (feature) {
            const intensity = Math.min(0.62, 0.16 + Math.log2(count + 1) * 0.09);
            const gj = L.geoJSON(feature as never, {
              style: {
                color: "#22c55e",
                weight: 1,
                opacity: 0.9,
                fillColor: "#22c55e",
                fillOpacity: intensity,
              },
            });

            gj.on("mouseover", () =>
              gj.setStyle({ weight: 2, fillOpacity: Math.min(0.8, intensity + 0.15) })
            );
            gj.on("mouseout", () =>
              gj.setStyle({ weight: 1, fillOpacity: intensity })
            );

            gj.bindPopup(html, { maxWidth: 320 });
            gj.bindTooltip(tooltip, { sticky: true, direction: "top" });
            gj.addTo(layer);

            const b = gj.getBounds();
            if (b && b.isValid()) {
              bounds.push([b.getSouth(), b.getWest()]);
              bounds.push([b.getNorth(), b.getEast()]);
            }
          } else if (group.lat != null && group.lng != null) {
            // Fallback dot for countries with no boundary in the GeoJSON.
            const radius = Math.min(14, 5 + Math.log2(count + 1) * 2.4);
            const marker = L.circleMarker([group.lat, group.lng], {
              radius,
              color: "#22c55e",
              fillColor: "#22c55e",
              fillOpacity: 0.55,
              weight: 1.5,
              opacity: 1,
            });
            marker.bindPopup(html, { maxWidth: 320 });
            marker.bindTooltip(tooltip, { direction: "top" });
            marker.addTo(layer);
            bounds.push([group.lat, group.lng]);
          }
        });

        if (refit) fitMapToBounds(bounds);
      },
      [fitMapToBounds]
    );

    const displayCached = useCallback(
      (tab: HazardTab, opts: { refit?: boolean } = {}) => {
        const meta = TAB_META[tab];
        const list = cacheRef.current[tab] || [];

        if (tab === "earthquake") {
          renderEarthquakes(list as EarthquakeEvent[], opts);
        } else if (tab === "wildfire") {
          renderWildfires(list as WildfireEvent[], opts);
        } else if (tab === "flight") {
          renderFlights(list as FlightEvent[], opts);
        } else {
          renderNews(list as FeedItem[], opts);
        }

        setHazardCount(String(list.length));
        setHazardError(false);
        setHazardStatus(
          list.length
            ? `${list.length} ${
                list.length === 1 ? meta.eventLabel : meta.eventLabelPlural
              } loaded`
            : meta.empty
        );
      },
      [renderEarthquakes, renderWildfires, renderFlights, renderNews]
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
          layerRef.current?.clearLayers();
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

        if (tab === "news") {
          newsNeedsFitRef.current = true;
          requestAnimationFrame(() => mapRef.current?.invalidateSize());
          return;
        }

        if (loadedRef.current[tab]) {
          displayCached(tab);
          requestAnimationFrame(() => mapRef.current?.invalidateSize());
        } else {
          loadHazardTab(tab);
        }
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

    useEffect(() => {
      if (activeTab !== "flight") return;

      loadHazardTab("flight", true, true);
      const interval = setInterval(
        () => loadHazardTab("flight", true, true),
        15000
      );
      return () => clearInterval(interval);
    }, [activeTab, loadHazardTab]);

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
          setMapReady(true);

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

    useEffect(() => {
      if (feeds === null) {
        if (activeTab === "news" && mapReady) {
          setOverlayText(TAB_META.news.overlayText);
          setOverlayActive(true);
          setHazardStatus(TAB_META.news.loading);
          setHazardError(false);
          setHazardCount("\u2026");
        }
        return;
      }

      const withCoords = feeds.filter(
        (f) => f.latitude != null && f.longitude != null
      );
      cacheRef.current.news = withCoords;
      loadedRef.current.news = true;

      if (activeTab !== "news" || !mapReady) return;

      const refit = newsNeedsFitRef.current;
      newsNeedsFitRef.current = false;
      renderNews(withCoords, { refit });

      const meta = TAB_META.news;
      setHazardCount(String(withCoords.length));
      setHazardError(feedsError);
      setHazardStatus(
        feedsError
          ? meta.fail
          : withCoords.length
          ? `${withCoords.length} ${
              withCoords.length === 1 ? meta.eventLabel : meta.eventLabelPlural
            } mapped`
          : meta.empty
      );
      setOverlayActive(false);
    }, [feeds, activeTab, mapReady, geoReady, renderNews, feedsError]);

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

        <div
          className={[
            "relative",
            "[&_.leaflet-container]:bg-[#0f131c] [&_.leaflet-container]:font-[inherit]",
            "[&_.leaflet-control-zoom_a]:bg-[#161b27]! [&_.leaflet-control-zoom_a]:text-[#e6e9ef]! [&_.leaflet-control-zoom_a]:border! [&_.leaflet-control-zoom_a]:border-[#1f2533]!",
            "[&_.leaflet-control-zoom_a:hover]:bg-[#1b2230]!",
            "[&_.leaflet-control-attribution]:bg-[rgba(15,19,28,0.8)]! [&_.leaflet-control-attribution]:text-[#5b6273]!",
            "[&_.leaflet-control-attribution_a]:text-[#8a93a6]!",
            "[&_.leaflet-popup-content-wrapper]:bg-[#161b27]! [&_.leaflet-popup-content-wrapper]:text-[#e6e9ef]!",
            "[&_.leaflet-popup-content-wrapper]:border! [&_.leaflet-popup-content-wrapper]:border-[#1f2533]!",
            "[&_.leaflet-popup-content-wrapper]:shadow-[0_12px_32px_rgba(0,0,0,0.6)]!",
            "[&_.leaflet-popup-tip]:bg-[#161b27]! [&_.leaflet-popup-tip]:border! [&_.leaflet-popup-tip]:border-[#1f2533]!",
            "[&_.leaflet-popup-content]:m-0! [&_.leaflet-popup-content]:text-xs! [&_.leaflet-popup-content]:leading-normal! [&_.leaflet-popup-content]:min-w-[200px]!",
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
