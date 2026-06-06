import { PLANE_SVG_PATH } from "@/lib/vision/constants";
import type { HazardTab } from "@/lib/vision/types";

interface MapLegendProps {
  activeTab: HazardTab;
}

export function MapLegend({ activeTab }: MapLegendProps) {
  return (
    <div
      aria-hidden="true"
      className="absolute left-3 bottom-3 z-400 flex flex-col gap-1.5 max-w-[260px] py-2 px-2.5 rounded-lg border border-[#1f2533] bg-[rgba(15,19,28,0.85)] backdrop-blur-md text-[10px] text-[#8a93a6] pointer-events-none select-none"
    >
      {activeTab === "news" ? (
        <div>
          <div className="text-[9px] font-bold tracking-[1.4px] uppercase text-[#5b6273] mb-[3px]">
            Stories by country
          </div>
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#22c55e] shadow-[0_0_4px_rgba(34,197,94,0.55)]" />
            <span className="mr-2 text-[#e6e9ef]">Few</span>
            <span className="inline-block w-2 h-2 rounded-full bg-[#22c55e] shadow-[0_0_5px_rgba(34,197,94,0.6)]" />
            <span className="mr-2 text-[#e6e9ef]">Several</span>
            <span className="inline-block w-3 h-3 rounded-full bg-[#22c55e] shadow-[0_0_6px_rgba(34,197,94,0.65)]" />
            <span className="mr-1.5 text-[#e6e9ef]">Many</span>
          </div>
        </div>
      ) : null}

      {activeTab === "earthquake" ? (
        <div>
          <div className="text-[9px] font-bold tracking-[1.4px] uppercase text-[#5b6273] mb-[3px]">
            Magnitude
          </div>
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#a3e635] text-[#a3e635] shadow-[0_0_6px_currentColor]" />
            <span className="mr-1.5 text-[#e6e9ef]">{"2.5\u20133.9"}</span>
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#eab308] text-[#eab308] shadow-[0_0_6px_currentColor]" />
            <span className="mr-1.5 text-[#e6e9ef]">{"4\u20134.9"}</span>
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#f97316] text-[#f97316] shadow-[0_0_6px_currentColor]" />
            <span className="mr-1.5 text-[#e6e9ef]">{"5\u20135.9"}</span>
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
            <span className="mr-1.5 text-[#e6e9ef]">Open event</span>
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
  );
}
