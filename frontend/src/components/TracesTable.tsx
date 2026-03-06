import type { Trace } from "../types";

interface Props {
  traces: Trace[];
}

const columns: { key: keyof Trace; label: string; format?: (v: unknown) => string }[] = [
  {
    key: "timestamp",
    label: "Timestamp",
    format: (v) => new Date(v as string).toLocaleString(),
  },
  { key: "model", label: "Model" },
  { key: "prompt_version", label: "Prompt Version" },
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

export default function TracesTable({ traces }: Props) {
  return (
    <div className="rounded-xl bg-white shadow ring-1 ring-gray-200 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-600">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-4 py-3 font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {traces.map((t) => (
            <tr key={t.trace_id} className="hover:bg-gray-50">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3 whitespace-nowrap">
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
