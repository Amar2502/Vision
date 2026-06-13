export function MapLegend() {
  return (
    <div
      aria-hidden="true"
      className="absolute left-3 bottom-3 z-400 flex flex-col gap-2 max-w-[260px] py-2 px-2.5 rounded-lg border border-[#1f2533] bg-[rgba(15,19,28,0.85)] backdrop-blur-md text-[10px] text-[#8a93a6] pointer-events-none select-none"
    >
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
