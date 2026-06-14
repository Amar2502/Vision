import { NewsItem } from "@/components/vision/NewsItem";
import { LiveBadge } from "@/components/vision/LiveBadge";
import type { FeedItem } from "@/lib/vision/types";

interface CategoryCardProps {
  category: string;
  items: FeedItem[];
  live: boolean;
  pulsing: boolean;
  selectedCountry: string | null;
}

export function CategoryCard({
  category,
  items,
  live,
  pulsing,
  selectedCountry,
}: CategoryCardProps) {
  return (
    <section className="relative flex flex-col h-[420px] max-[640px]:h-[380px] overflow-hidden rounded-md bg-[#11151f] border border-[#1f2533] transition-colors duration-200 hover:border-[#2a3245] before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-0.5 before:bg-[#22c55e] before:opacity-85">
      <div className="flex items-center justify-between gap-2 py-3 px-3 pb-2.5 border-b border-[#1a1f2b]">
        <div className="flex-1 min-w-0 text-xs font-bold tracking-[1.4px] uppercase text-[#e6e9ef] overflow-hidden text-ellipsis whitespace-nowrap">
          {category}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <LiveBadge active={live} pulsing={pulsing} />
          <span className="text-[10px] font-semibold text-[#8a93a6] py-0.5 px-[7px] rounded-[10px] bg-[#161b27] border border-[#1f2533] min-w-[22px] text-center">
            {items.length}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-1 scrollbar-thin [scrollbar-color:#2a3245_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#232a3a] [&::-webkit-scrollbar-thumb]:rounded-[3px] [&::-webkit-scrollbar-thumb:hover]:bg-[#2f3748]">
        {items.length ? (
          items.map((item, idx) => (
            <NewsItem
              key={`${item.link}-${idx}`}
              item={item}
              highlighted={
                selectedCountry !== null &&
                item.country?.includes(selectedCountry)
              }
            />
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
