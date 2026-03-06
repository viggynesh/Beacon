import type { Trace } from "../types";

interface Props {
  traces: Trace[];
  onSelect: (trace: Trace) => void;
}

const columns: { key: keyof Trace; label: string; align?: string; format?: (v: unknown) => string }[] = [
  {
    key: "timestamp",
    label: "Time",
    format: (v) => {
      const d = new Date(v as string);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    },
  },
  { key: "model", label: "Model" },
  { key: "prompt_version", label: "Version" },
  {
    key: "total_tokens",
    label: "Tokens",
    align: "right",
    format: (v) => (v as number).toLocaleString(),
  },
  {
    key: "estimated_cost_usd",
    label: "Cost",
    align: "right",
    format: (v) => `$${(v as number).toFixed(4)}`,
  },
  {
    key: "latency_ms",
    label: "Latency",
    align: "right",
    format: (v) => `${v}ms`,
  },
];

export default function TracesTable({ traces, onSelect }: Props) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1e]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
        <div>
          <h2 className="text-sm font-semibold text-gray-200">Recent Traces</h2>
          <p className="mt-0.5 text-xs text-gray-500">{traces.length} traces — click to inspect</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-[13px]">
          <thead>
            <tr className="border-b border-white/[0.04] text-left text-[11px] uppercase tracking-wider text-gray-500">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`px-5 py-2.5 font-medium ${c.align === "right" ? "text-right" : ""}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {traces.map((t, i) => (
              <tr
                key={t.trace_id}
                onClick={() => onSelect(t)}
                className={`cursor-pointer text-gray-300 transition-colors hover:bg-white/[0.03] ${
                  i !== traces.length - 1 ? "border-b border-white/[0.03]" : ""
                }`}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-5 py-2.5 whitespace-nowrap ${c.align === "right" ? "text-right tabular-nums" : ""} ${
                      c.key === "model" ? "font-medium text-gray-200" : ""
                    }`}
                  >
                    {c.format ? c.format(t[c.key]) : String(t[c.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
