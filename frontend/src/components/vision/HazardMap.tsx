"use client";

import dynamic from "next/dynamic";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import type {
  GlobePoint,
  GlobePolygon,
} from "@/components/vision/GlobeView";
import { MapLegend } from "@/components/vision/MapLegend";
import { fetchEarthquakes } from "@/lib/vision/api";
import { MAP_SUBTITLE } from "@/lib/vision/constants";
import {
  earthquakeColor,
  escapeHtml,
  formatEarthquakeTime,
  formatNumber,
} from "@/lib/vision/helpers";
import type { EarthquakeEvent, FeedItem } from "@/lib/vision/types";

// The globe relies on WebGL/`window`, so it must only load on the client.
const GlobeView = dynamic(() => import("@/components/vision/GlobeView"), {
  ssr: false,
});

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

// Lightweight HTML tooltip shown on hover by globe.gl (rendered outside the
// React tree, so styling is inline rather than Tailwind).
const tipShell =
  "font-family:Inter,system-ui,sans-serif;background:#161b27;color:#e6e9ef;border:1px solid #1f2533;border-radius:8px;padding:8px 10px;max-width:240px;box-shadow:0 12px 32px rgba(0,0,0,0.55)";

function newsTooltip(country: string, items: FeedItem[]): string {
  const heads = items
    .slice(0, 3)
    .map(
      (f) =>
        `<div style="font-size:11px;color:#cbd2e0;line-height:1.35;margin-top:3px">\u2022 ${escapeHtml(
          f.title || ""
        )}</div>`
    )
    .join("");
  const more =
    items.length > 3
      ? `<div style="font-size:10px;color:#5b6273;margin-top:4px">+${
          items.length - 3
        } more \u00b7 click to open</div>`
      : `<div style="font-size:10px;color:#5b6273;margin-top:4px">click to open</div>`;
  return `<div style="${tipShell}">
    <div style="font-size:12px;font-weight:700;color:#22c55e">${escapeHtml(
      country
    )} \u00b7 ${items.length} ${items.length === 1 ? "story" : "stories"}</div>
    ${heads}${more}
  </div>`;
}

function quakeTooltip(eq: EarthquakeEvent, color: string): string {
  return `<div style="${tipShell}">
    <div style="display:flex;align-items:center;gap:6px">
      <span style="background:${color};color:#0a0d14;font-weight:800;font-size:12px;border-radius:5px;padding:1px 6px">M ${(
        eq.magnitude ?? 0
      ).toFixed(1)}</span>
      <span style="font-size:11.5px;font-weight:600">${escapeHtml(
        eq.place || "Unknown location"
      )}</span>
    </div>
    <div style="font-size:10px;color:#5b6273;margin-top:4px">${escapeHtml(
      formatEarthquakeTime(eq.time)
    )}</div>
  </div>`;
}

type Selection =
  | { kind: "news"; country: string; items: FeedItem[] }
  | { kind: "quake"; eq: EarthquakeEvent }
  | null;

export interface HazardMapHandle {
  refresh: () => Promise<void>;
}

interface HazardMapProps {
  feeds: FeedItem[] | null;
  feedsError: boolean;
  feedsLoading: boolean;
}

export const HazardMap = forwardRef<HazardMapHandle, HazardMapProps>(
  function HazardMap({ feeds, feedsError, feedsLoading }, ref) {
    const [earthquakes, setEarthquakes] = useState<EarthquakeEvent[]>([]);
    const [quakeError, setQuakeError] = useState(false);
    const [countryFeatures, setCountryFeatures] = useState<
      Map<string, unknown>
    >(() => new Map());
    const [selection, setSelection] = useState<Selection>(null);

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
          setCountryFeatures(map);
        })
        .catch((err) => {
          console.error("Failed to load country boundaries", err);
        });
      return () => {
        cancelled = true;
      };
    }, []);

    const loadEarthquakes = useCallback(async () => {
      try {
        setEarthquakes(await fetchEarthquakes());
        setQuakeError(false);
      } catch (err) {
        console.error(err);
        setEarthquakes([]);
        setQuakeError(true);
      }
    }, []);

    useEffect(() => {
      loadEarthquakes();
    }, [loadEarthquakes]);

    useImperativeHandle(
      ref,
      () => ({ refresh: () => loadEarthquakes() }),
      [loadEarthquakes]
    );

    // Group geotagged stories by country into choropleth polygons.
    const polygons = useMemo<GlobePolygon[]>(() => {
      if (countryFeatures.size === 0 || !feeds) return [];

      const groups = new Map<string, FeedItem[]>();
      for (const item of feeds) {
        const countries = Array.isArray(item.country)
          ? item.country.filter(Boolean)
          : [];
        if (countries.length === 0) continue;

        for (const country of countries) {
          const existing = groups.get(country);
          if (existing) existing.push(item);
          else groups.set(country, [item]);
        }
      }

      const result: GlobePolygon[] = [];
      groups.forEach((items, country) => {
        const feature = lookupCountryFeature(country, countryFeatures);
        if (!feature) return;

        const count = items.length;
        const maxImportance = Math.max(
          ...items.map((item) => item.importance ?? 0)
        );
        const intensity = Math.min(
          0.72,
          0.28 + Math.log2(count + 1) * 0.1 + maxImportance * 0.04
        );

        result.push({
          feature,
          country,
          count,
          altitude: 0.012,
          capColor: `rgba(22,101,52,${intensity.toFixed(3)})`,
          label: newsTooltip(country, items),
          payload: items,
        });
      });
      return result;
    }, [feeds, countryFeatures]);

    // Earthquakes become glowing points sized/colored by magnitude.
    const points = useMemo<GlobePoint[]>(() => {
      return earthquakes
        .filter((eq) => eq.coordinates && eq.coordinates.length >= 2)
        .map((eq) => {
          const mag = eq.magnitude ?? 0;
          const color = earthquakeColor(mag);
          return {
            lat: eq.coordinates[1],
            lng: eq.coordinates[0],
            color,
            radius: Math.min(0.7, 0.18 + Math.max(0, mag - 4) * 0.08),
            altitude: 0.01 + Math.max(0, mag - 4) * 0.012,
            label: quakeTooltip(eq, color),
            payload: eq,
          };
        });
    }, [earthquakes]);

    const handlePolygonClick = useCallback((p: GlobePolygon) => {
      setSelection({
        kind: "news",
        country: p.country,
        items: (p.payload as FeedItem[]) ?? [],
      });
    }, []);

    const handlePointClick = useCallback((p: GlobePoint) => {
      setSelection({ kind: "quake", eq: p.payload as EarthquakeEvent });
    }, []);

    const storyCount = polygons.reduce((sum, p) => sum + p.count, 0);
    const quakeCount = points.length;

    const geoLoading = countryFeatures.size === 0;
    const hasError = feedsError && quakeError;

    let statusText: string;
    if (hasError) {
      statusText = "Failed to load live map data.";
    } else if (feedsLoading) {
      statusText = `Loading news feeds\u2026 \u00b7 ${quakeCount} ${
        quakeCount === 1 ? "earthquake" : "earthquakes"
      } mapped`;
    } else {
      const storyLabel = `${storyCount} ${
        storyCount === 1 ? "story" : "stories"
      }`;
      const quakeLabel = `${quakeCount} ${
        quakeCount === 1 ? "earthquake" : "earthquakes"
      }`;
      const note = feedsError
        ? " \u00b7 news feed unavailable"
        : quakeError
        ? " \u00b7 seismic feed unavailable"
        : "";
      statusText = `${storyLabel} \u00b7 ${quakeLabel} mapped${note}`;
    }

    return (
      <section
        className={[
          "relative overflow-hidden rounded-[10px] border border-[#1f2533] mb-[18px]",
          "shadow-[0_8px_24px_rgba(0,0,0,0.35)]",
          "bg-[#11151f] bg-[linear-gradient(180deg,rgba(34,197,94,0.05),transparent_30%)]",
          "before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-0.5 before:opacity-90 before:z-2",
          "before:bg-[linear-gradient(90deg,transparent,#22c55e_20%,#38bdf8_80%,transparent)]",
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-3 py-3.5 px-4 pb-3 border-b border-[#1a1f2b]">
          <div className="min-w-0 flex-1">
            <h2 className="text-[13px] font-bold tracking-[0.4px] text-[#e6e9ef] m-0 mb-1">
              Global Live Globe
            </h2>
            <p className="text-[#5b6273] text-[11px] leading-[1.4] tracking-[0.3px] m-0">
              {MAP_SUBTITLE}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-[1px] py-0.5 px-1.5 rounded-[3px] bg-[rgba(34,197,94,0.15)] text-[#22c55e] border border-[rgba(34,197,94,0.35)] before:content-[''] before:w-[5px] before:h-[5px] before:rounded-full before:bg-[#22c55e] before:shadow-[0_0_6px_#22c55e] before:animate-pulse">
              LIVE
            </span>
            <span className="text-[10px] font-semibold text-[#8a93a6] py-0.5 px-[7px] rounded-[10px] bg-[#161b27] border border-[#1f2533] min-w-[22px] text-center">
              {storyCount + quakeCount}
            </span>
          </div>
        </div>

        <div className="relative h-[460px] max-[640px]:h-[360px] w-full bg-black overflow-hidden">
          <GlobeView
            polygons={polygons}
            points={points}
            onPolygonClick={handlePolygonClick}
            onPointClick={handlePointClick}
            onGlobeClick={() => setSelection(null)}
          />

          <div
            aria-hidden={!geoLoading}
            className={[
              "absolute inset-0 flex flex-col items-center justify-center gap-3.5 z-500",
              "bg-[rgba(10,13,20,0.72)] backdrop-blur-[2px]",
              "transition-opacity duration-250",
              geoLoading
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none",
            ].join(" ")}
          >
            <div
              role="status"
              aria-live="polite"
              className="relative w-[52px] h-[52px] text-[#22c55e]"
            >
              <div className="absolute inset-0 border-2 border-transparent rounded-full border-t-current animate-[spin_1.1s_linear_infinite]" />
              <div className="absolute inset-[7px] border-2 border-transparent rounded-full border-r-current opacity-70 animate-[spin_1.6s_linear_infinite_reverse]" />
              <div className="absolute inset-[14px] border-2 border-transparent rounded-full border-b-current opacity-40 animate-[spin_2.1s_linear_infinite]" />
            </div>
            <div className="text-[11px] font-bold tracking-[2px] uppercase text-[#8a93a6]">
              Spinning up the globe
            </div>
          </div>

          {selection ? (
            <DetailPanel
              selection={selection}
              onClose={() => setSelection(null)}
            />
          ) : null}

          <MapLegend />
        </div>

        <div
          className={[
            "flex items-center gap-2 py-2.5 px-4 text-[11px] tracking-[0.3px] border-t border-[#1a1f2b]",
            "before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:shadow-[0_0_4px_currentColor]",
            hasError
              ? "text-[#ef4444] before:bg-[#ef4444]"
              : "text-[#8a93a6] before:bg-[#22c55e]",
          ].join(" ")}
        >
          {statusText}
        </div>
      </section>
    );
  }
);

function DetailPanel({
  selection,
  onClose,
}: {
  selection: NonNullable<Selection>;
  onClose: () => void;
}) {
  const panelCls =
    "absolute top-3 right-3 z-500 w-[300px] max-[640px]:w-[calc(100%-1.5rem)] max-h-[calc(100%-1.5rem)] overflow-y-auto rounded-lg border border-[#1f2533] bg-[rgba(15,19,28,0.95)] backdrop-blur-md shadow-[0_12px_32px_rgba(0,0,0,0.6)]";

  if (selection.kind === "quake") {
    const eq = selection.eq;
    const mag = eq.magnitude ?? 0;
    const color = earthquakeColor(mag);
    const depth =
      eq.coordinates?.[2] != null
        ? `${Number(eq.coordinates[2]).toFixed(1)} km`
        : "\u2014";
    const felt = eq.felt != null ? formatNumber(eq.felt) : "\u2014";
    const cdi = eq.cdi != null ? String(eq.cdi) : "\u2014";

    return (
      <div className={panelCls}>
        <PanelHeader onClose={onClose}>
          <span
            className="inline-flex items-center justify-center min-w-[42px] py-1 px-2 rounded-md text-[13px] font-extrabold text-[#0a0d14]"
            style={{ background: color }}
          >
            M {mag.toFixed(1)}
          </span>
          <span className="text-[12.5px] font-semibold text-[#e6e9ef] leading-[1.35] flex-1 min-w-0">
            {eq.place || "Unknown location"}
          </span>
        </PanelHeader>
        <dl className="grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-[5px] text-[11.5px] m-0 p-3 px-3.5">
          <PanelRow label="Depth" value={depth} />
          <PanelRow label="Felt" value={felt} />
          <PanelRow label="CDI" value={cdi} />
          <PanelRow label="Time" value={formatEarthquakeTime(eq.time)} />
        </dl>
      </div>
    );
  }

  const { country, items } = selection;
  return (
    <div className={panelCls}>
      <PanelHeader onClose={onClose}>
        <span className="inline-flex items-center justify-center min-w-[34px] py-1 px-2 rounded-md text-[12px] font-extrabold text-[#0a0d14] bg-[linear-gradient(135deg,#4ade80,#22c55e)]">
          {items.length}
        </span>
        <span className="text-[12.5px] font-semibold text-[#e6e9ef] leading-[1.35] flex-1 min-w-0">
          {country}
        </span>
      </PanelHeader>
      <div className="p-2 px-3.5 pb-3">
        {items.slice(0, 12).map((f, i) => (
          <a
            key={`${f.link}-${i}`}
            href={f.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block py-1.5 border-b border-[#1a1f2b] last:border-b-0 no-underline transition-colors hover:text-[#22c55e]"
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[9px] font-bold tracking-[0.6px] uppercase text-[#8a93a6]">
                {f.source || ""}
              </span>
              {f.category ? (
                <span className="text-[9px] text-[#5b6273] tracking-[0.4px]">
                  {"\u00b7"} {f.category}
                </span>
              ) : null}
            </div>
            <div className="text-[11.5px] font-medium leading-snug text-[#e6e9ef]">
              {f.title || ""}
            </div>
          </a>
        ))}
        {items.length > 12 ? (
          <div className="pt-1.5 text-[10px] text-[#5b6273] tracking-[0.4px]">
            +{items.length - 12} more
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PanelHeader({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5 p-3 px-3.5 border-b border-[#1a1f2b] sticky top-0 bg-[rgba(15,19,28,0.95)]">
      {children}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="shrink-0 text-[#5b6273] hover:text-[#e6e9ef] text-[16px] leading-none cursor-pointer"
      >
        {"\u00d7"}
      </button>
    </div>
  );
}

function PanelRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-[#5b6273] font-semibold uppercase text-[10px] tracking-[0.8px] self-center">
        {label}
      </dt>
      <dd className="text-[#e6e9ef] m-0">{value}</dd>
    </>
  );
}
