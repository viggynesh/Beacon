import type { Trace } from "../types";

interface Props {
  traces: Trace[];
  onSelect: (trace: Trace) => void;
}

const columns: { key: keyof Trace; label: string; format?: (v: unknown) => string }[] = [
  {
    key: "timestamp",
    label: "Timestamp",
    format: (v) => new Date(v as string).toLocaleString(),
  },
  { key: "model", label: "Model" },
  { key: "prompt_version", label: "Version" },
  {
    key: "total_tokens",
    label: "Tokens",
    format: (v) => (v as number).toLocaleString(),
  },
  {
    key: "estimated_cost_usd",
    label: "Cost",
    format: (v) => `$${(v as number).toFixed(4)}`,
  },
  {
    key: "latency_ms",
    label: "Latency",
    format: (v) => `${v} ms`,
  },
];

export default function TracesTable({ traces, onSelect }: Props) {
  return (
    <div className="rounded-2xl bg-[#0f1629] shadow-xl ring-1 ring-white/10 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-gray-400">
            {columns.map((c) => (
              <th key={c.key} className="px-5 py-3.5 font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {traces.map((t) => (
            <tr
              key={t.trace_id}
              onClick={() => onSelect(t)}
              className="cursor-pointer text-gray-300 transition-colors hover:bg-white/5"
            >
              {columns.map((c) => (
                <td key={c.key} className="px-5 py-3 whitespace-nowrap">
                  {c.format ? c.format(t[c.key]) : String(t[c.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
