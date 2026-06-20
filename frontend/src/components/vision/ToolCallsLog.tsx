import type { ToolCallEntry } from "@/lib/vision/types";

function formatToolOutput(output: unknown): string {
  if (output == null || output === "") return "Done";

  if (Array.isArray(output)) {
    return `Retrieved ${output.length} result${output.length === 1 ? "" : "s"}`;
  }

  if (typeof output === "string") {
    const trimmed = output.trim();
    return trimmed.length > 160 ? `${trimmed.slice(0, 160)}…` : trimmed;
  }

  if (typeof output === "object") {
    const record = output as Record<string, unknown>;
    if (typeof record.count === "number") {
      const label = Array.isArray(record.articles) ? "articles" : "results";
      return `Retrieved ${record.count} ${label}`;
    }
    if (typeof record.note === "string") {
      return record.note;
    }

    try {
      const serialized = JSON.stringify(output);
      return serialized.length > 160
        ? `${serialized.slice(0, 160)}…`
        : serialized;
    } catch {
      return "Done";
    }
  }

  return String(output);
}

interface ToolCallsLogProps {
  tools: ToolCallEntry[];
}

export function ToolCallsLog({ tools }: ToolCallsLogProps) {
  return (
    <div className="space-y-2">
      {tools.map((tool) => (
        <div
          key={tool.id}
          className="rounded-md border border-[#1f2533] bg-[#0f131c] px-3 py-2.5"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={[
                "shrink-0 w-1.5 h-1.5 rounded-full",
                tool.status === "running"
                  ? "bg-[#22c55e] animate-pulse shadow-[0_0_8px_#22c55e]"
                  : "bg-[#22c55e]",
              ].join(" ")}
            />
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold text-[#e6e9ef]">
                {tool.label}
              </div>
              <div className="text-[10px] uppercase tracking-[0.8px] text-[#5b6273] mt-0.5">
                {tool.name}
              </div>
            </div>
            <span
              className={[
                "shrink-0 text-[10px] font-semibold uppercase tracking-[0.8px] px-2 py-0.5 rounded-[10px] border",
                tool.status === "running"
                  ? "text-[#22c55e] border-[#22c55e]/30 bg-[#22c55e]/10"
                  : "text-[#8a93a6] border-[#1f2533] bg-[#161b27]",
              ].join(" ")}
            >
              {tool.status === "running" ? "Running" : "Done"}
            </span>
          </div>

          {tool.status === "done" && tool.output !== undefined ? (
            <div className="mt-2 pt-2 border-t border-[#1a1f2b] text-[11px] leading-normal text-[#8a93a6] wrap-break-word">
              {formatToolOutput(tool.output)}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
