import type { VisionTab } from "@/lib/vision/types";

interface HeaderProps {
  activeTab: VisionTab;
  onTabChange: (tab: VisionTab) => void;
  refreshing: boolean;
  onRefresh: () => void;
}

const tabs: { id: VisionTab; label: string }[] = [
  { id: "news", label: "News" },
  { id: "chat", label: "Chat" },
];

export function Header({
  activeTab,
  onTabChange,
  refreshing,
  onRefresh,
}: HeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4 mb-[18px] px-1 pt-1.5 pb-3.5 border-b border-[#1a1f2b] max-[640px]:flex-wrap">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] shadow-[0_0_10px_#22c55e] shrink-0" />
        <h1 className="text-lg tracking-[3px] font-bold m-0 shrink-0">VISION</h1>
        <span className="text-[#5b6273] text-xs tracking-[1px] ml-1.5 max-[640px]:hidden">
          Live News Intelligence
        </span>
      </div>

      <nav
        className="flex items-center gap-1 rounded-lg border border-[#1f2533] bg-[#11151f] p-1 max-[640px]:order-3 max-[640px]:w-full max-[640px]:justify-center"
        aria-label="Main sections"
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              aria-current={active ? "page" : undefined}
              className={[
                "rounded-md px-4 py-1.5 text-xs font-semibold tracking-[0.8px] uppercase transition-colors duration-200 cursor-pointer border",
                active
                  ? "bg-[#161b27] text-[#22c55e] border-[#22c55e]/40 shadow-[0_0_12px_rgba(34,197,94,0.12)]"
                  : "bg-transparent text-[#8a93a6] border-transparent hover:text-[#e6e9ef] hover:bg-[#161b27]",
              ].join(" ")}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center shrink-0">
        {activeTab === "news" ? (
          <button
            type="button"
            onClick={onRefresh}
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
        ) : (
          <span className="text-[11px] text-[#5b6273] tracking-[0.6px] uppercase max-[640px]:hidden">
            AI Agent
          </span>
        )}
      </div>
    </header>
  );
}
