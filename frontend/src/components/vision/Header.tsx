interface HeaderProps {
  refreshing: boolean;
  onRefresh: () => void;
}

export function Header({ refreshing, onRefresh }: HeaderProps) {
  return (
    <header className="flex items-center justify-between mb-[18px] px-1 pt-1.5 pb-3.5 border-b border-[#1a1f2b]">
      <div className="flex items-center gap-2.5">
        <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] shadow-[0_0_10px_#22c55e]" />
        <h1 className="text-lg tracking-[3px] font-bold m-0">VISION</h1>
        <span className="text-[#5b6273] text-xs tracking-[1px] ml-1.5 max-[640px]:hidden">
          Live News Intelligence
        </span>
      </div>
      <div className="flex items-center">
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
      </div>
    </header>
  );
}
