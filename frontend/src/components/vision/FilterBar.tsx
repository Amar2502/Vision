interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedCountry: string | null;
  onCountryClear: () => void;
  minImportance: number;
  onMinImportanceChange: (value: number) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  categories: string[];
  resultCount: number;
  totalCount: number;
}

const IMPORTANCE_OPTIONS = [
  { value: 0, label: "Any importance" },
  { value: 1, label: "Minor+" },
  { value: 2, label: "Notable+" },
  { value: 3, label: "National+" },
  { value: 4, label: "Major+" },
  { value: 5, label: "Critical only" },
];

export function FilterBar({
  search,
  onSearchChange,
  selectedCountry,
  onCountryClear,
  minImportance,
  onMinImportanceChange,
  categoryFilter,
  onCategoryFilterChange,
  categories,
  resultCount,
  totalCount,
}: FilterBarProps) {
  const hasFilters =
    search.trim() !== "" ||
    selectedCountry !== null ||
    minImportance > 0 ||
    categoryFilter !== "";

  return (
    <div
      className="flex flex-wrap items-center gap-2 mb-3.5 py-2.5 px-3 rounded-lg border border-[#1f2533] bg-[#11151f]"
    >
      <label className="relative flex-1 min-w-[140px] max-w-[280px]">
        <span className="sr-only">Search stories</span>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search title or summary…"
          className="w-full py-1.5 px-2.5 pl-8 rounded-md border border-[#1f2533] bg-[#0f131c] text-[#e6e9ef] text-[12px] placeholder:text-[#5b6273] outline-none focus:border-[#22c55e]/50"
        />
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5b6273] pointer-events-none"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
          <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </label>

      <label className="min-w-[120px]">
        <span className="sr-only">Filter by category</span>
        <select
          value={categoryFilter}
          onChange={(e) => onCategoryFilterChange(e.target.value)}
          className="w-full py-1.5 px-2 rounded-md border border-[#1f2533] bg-[#0f131c] text-[#e6e9ef] text-[12px] outline-none focus:border-[#22c55e]/50 cursor-pointer"
        >
          <option value="">All categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </label>

      <label className="min-w-[130px]">
        <span className="sr-only">Minimum importance</span>
        <select
          value={minImportance}
          onChange={(e) => onMinImportanceChange(Number(e.target.value))}
          className="w-full py-1.5 px-2 rounded-md border border-[#1f2533] bg-[#0f131c] text-[#e6e9ef] text-[12px] outline-none focus:border-[#22c55e]/50 cursor-pointer"
        >
          {IMPORTANCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </label>

      {selectedCountry ? (
        <button
          type="button"
          onClick={onCountryClear}
          className="inline-flex items-center gap-1.5 py-1.5 px-2.5 rounded-md border border-[rgba(34,197,94,0.4)] bg-[rgba(34,197,94,0.1)] text-[#22c55e] text-[11px] font-semibold cursor-pointer hover:bg-[rgba(34,197,94,0.15)]"
        >
          <span>{selectedCountry}</span>
          <span aria-hidden="true">×</span>
        </button>
      ) : null}

      {hasFilters ? (
        <button
          type="button"
          onClick={() => {
            onSearchChange("");
            onCountryClear();
            onMinImportanceChange(0);
            onCategoryFilterChange("");
          }}
          className="py-1.5 px-2.5 rounded-md border border-[#1f2533] bg-transparent text-[#8a93a6] text-[11px] cursor-pointer hover:text-[#e6e9ef] hover:border-[#2a3245]"
        >
          Clear filters
        </button>
      ) : null}

      <span className="text-[11px] text-[#5b6273] ml-auto shrink-0">
        {resultCount === totalCount
          ? `${totalCount} stories`
          : `${resultCount} of ${totalCount} stories`}
      </span>
    </div>
  );
}
