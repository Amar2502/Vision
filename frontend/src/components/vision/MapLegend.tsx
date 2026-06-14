import { countryChoroplethIntensity } from "@/lib/vision/helpers";

function OpacitySwatch({ opacity, label }: { opacity: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 mr-2">
      <span
        className="inline-block w-5 h-3 rounded-sm border border-[rgba(34,197,94,0.35)]"
        style={{ background: `rgba(22,101,52,${opacity.toFixed(3)})` }}
      />
      <span className="text-[#e6e9ef]">{label}</span>
    </span>
  );
}

export function MapLegend() {
  const light = countryChoroplethIntensity(1, 0);
  const medium = countryChoroplethIntensity(4, 2);
  const heavy = countryChoroplethIntensity(10, 5);

  return (
    <div
      aria-hidden="true"
      className="absolute left-3 bottom-3 z-40 flex flex-col gap-2 max-w-[260px] py-2 px-2.5 rounded-lg border border-[#1f2533] bg-[rgba(15,19,28,0.85)] backdrop-blur-md text-[10px] text-[#8a93a6] pointer-events-none select-none"
    >
      <div>
        <div className="text-[9px] font-bold tracking-[1.4px] uppercase text-[#5b6273] mb-[3px]">
          Stories by country
        </div>
        <div className="flex items-center flex-wrap gap-y-1">
          <OpacitySwatch opacity={light} label="Few" />
          <OpacitySwatch opacity={medium} label="Several" />
          <OpacitySwatch opacity={heavy} label="Many" />
        </div>
      </div>

      <div>
        <div className="text-[9px] font-bold tracking-[1.4px] uppercase text-[#5b6273] mb-[3px]">
          Earthquake magnitude
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
    </div>
  );
}
