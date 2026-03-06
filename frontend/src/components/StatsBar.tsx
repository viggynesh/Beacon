import type { ModelStats } from "../types";

interface Props {
  stats: ModelStats[];
}

export default function StatsBar({ stats }: Props) {
  const totalCost = stats.reduce((sum, s) => sum + s.total_cost_usd, 0);
  const totalTokens = stats.reduce((sum, s) => sum + s.total_tokens, 0);
  const totalTraces = stats.reduce((sum, s) => sum + s.trace_count, 0);
  const weightedLatency =
    totalTraces > 0
      ? stats.reduce((sum, s) => sum + s.avg_latency_ms * s.trace_count, 0) /
        totalTraces
      : 0;

  const cards = [
    { label: "Total Cost", value: `$${totalCost.toFixed(4)}` },
    { label: "Avg Latency", value: `${weightedLatency.toFixed(0)} ms` },
    { label: "Total Tokens", value: totalTokens.toLocaleString() },
    { label: "Total Traces", value: totalTraces.toLocaleString() },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl bg-white p-4 shadow ring-1 ring-gray-200"
        >
          <p className="text-sm text-gray-500">{c.label}</p>
          <p className="mt-1 text-2xl font-semibold">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
