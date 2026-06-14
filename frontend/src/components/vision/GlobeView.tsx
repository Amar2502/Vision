"use client";

import { useEffect, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";

export interface GlobePolygon {
  feature: unknown;
  country: string;
  count: number;
  capColor: string;
  altitude: number;
  label: string;
  payload?: unknown;
}

export interface GlobePoint {
  lat: number;
  lng: number;
  color: string;
  radius: number;
  altitude: number;
  label: string;
  payload?: unknown;
}

interface GlobeViewProps {
  polygons: GlobePolygon[];
  points: GlobePoint[];
  onPolygonClick?: (p: GlobePolygon) => void;
  onPointClick?: (p: GlobePoint) => void;
  onGlobeClick?: () => void;
  selectedCountry?: string | null;
}

const EARTH_DARK = "//unpkg.com/three-globe/example/img/earth-dark.jpg";
const EARTH_BUMP = "//unpkg.com/three-globe/example/img/earth-topology.png";

export default function GlobeView({
  polygons,
  points,
  onPolygonClick,
  onPointClick,
  onGlobeClick,
  selectedCountry = null,
}: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const setAutoRotate = (enabled: boolean) => {
    const controls = globeRef.current?.controls();
    if (controls) controls.autoRotate = enabled;
  };

  // Track the container size so the WebGL canvas stays responsive.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () =>
      setSize({ width: el.clientWidth, height: el.clientHeight });

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Initial camera position + gentle auto-rotation once the globe exists.
  useEffect(() => {
    if (size.width === 0) return;
    const globe = globeRef.current;
    if (!globe) return;

    globe.pointOfView({ lat: 20, lng: 10, altitude: 2.4 }, 0);

    const controls = globe.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.45;
      controls.enableZoom = true;
      controls.minDistance = 180;
      controls.maxDistance = 600;
    }
  }, [size.width]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      onPointerEnter={() => setAutoRotate(false)}
      onPointerLeave={() => setAutoRotate(true)}
    >
      {size.width > 0 && (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          backgroundColor="#0b0e16"
          globeImageUrl={EARTH_DARK}
          bumpImageUrl={EARTH_BUMP}
          showAtmosphere
          atmosphereColor="#38bdf8"
          atmosphereAltitude={0.16}
          // News choropleth
          polygonsData={polygons}
          polygonGeoJsonGeometry={(d) =>
            ((d as GlobePolygon).feature as { geometry: unknown })
              .geometry as never
          }
          polygonAltitude={(d) => {
            const poly = d as GlobePolygon;
            const selected = selectedCountry && poly.country === selectedCountry;
            return selected ? poly.altitude + 0.006 : poly.altitude;
          }}
          polygonCapColor={(d) => {
            const poly = d as GlobePolygon;
            if (selectedCountry && poly.country === selectedCountry) {
              return poly.capColor.replace(
                /rgba\((\d+),(\d+),(\d+),([\d.]+)\)/,
                (_, r, g, b) =>
                  `rgba(${r},${g},${b},0.88)`
              );
            }
            return poly.capColor;
          }}
          polygonSideColor={(d) => {
            const poly = d as GlobePolygon;
            return selectedCountry && poly.country === selectedCountry
              ? "rgba(74,222,128,0.45)"
              : "rgba(34,197,94,0.15)";
          }}
          polygonStrokeColor={(d) => {
            const poly = d as GlobePolygon;
            return selectedCountry && poly.country === selectedCountry
              ? "rgba(74,222,128,0.95)"
              : "rgba(34,197,94,0.55)";
          }}
          polygonLabel={(d) => (d as GlobePolygon).label}
          polygonsTransitionDuration={300}
          onPolygonClick={(d) => onPolygonClick?.(d as GlobePolygon)}
          // Earthquakes
          pointsData={points}
          pointLat={(d) => (d as GlobePoint).lat}
          pointLng={(d) => (d as GlobePoint).lng}
          pointColor={(d) => (d as GlobePoint).color}
          pointAltitude={(d) => (d as GlobePoint).altitude}
          pointRadius={(d) => (d as GlobePoint).radius}
          pointLabel={(d) => (d as GlobePoint).label}
          pointsMerge={false}
          pointsTransitionDuration={300}
          onPointClick={(d) => onPointClick?.(d as GlobePoint)}
          onGlobeClick={() => onGlobeClick?.()}
        />
      )}
    </div>
  );
}
