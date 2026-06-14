type LiveBadgeVariant = "green" | "red";

interface LiveBadgeProps {
  active: boolean;
  pulsing?: boolean;
  variant?: LiveBadgeVariant;
}

const VARIANT_STYLES: Record<
  LiveBadgeVariant,
  { badge: string; dot: string }
> = {
  green: {
    badge:
      "bg-[rgba(34,197,94,0.15)] text-[#22c55e] border-[rgba(34,197,94,0.35)]",
    dot: "bg-[#22c55e] shadow-[0_0_6px_#22c55e]",
  },
  red: {
    badge:
      "bg-[rgba(239,68,68,0.15)] text-[#ef4444] border-[rgba(239,68,68,0.35)]",
    dot: "bg-[#ef4444] shadow-[0_0_6px_#ef4444]",
  },
};

export function LiveBadge({
  active,
  pulsing = false,
  variant = "green",
}: LiveBadgeProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <span
      className={[
        "inline-flex items-center gap-1 text-[9px] font-bold tracking-[1px] py-0.5 px-1.5 rounded-[3px] border",
        active ? styles.badge : "bg-[#161b27] text-[#5b6273] border-[#1f2533]",
      ].join(" ")}
    >
      <span
        className={[
          "w-[5px] h-[5px] rounded-full shrink-0",
          active ? styles.dot : "bg-[#5b6273]",
          active && pulsing ? "animate-pulse" : "",
        ].join(" ")}
      />
      {active ? "LIVE" : "OFFLINE"}
    </span>
  );
}
