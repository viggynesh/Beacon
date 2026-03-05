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
    { label: "Total Cost", value: `$${totalCost.toFixed(4)}`, accent: "from-violet-500/20 to-violet-500/5 ring-violet-500/20" },
    { label: "Avg Latency", value: `${weightedLatency.toFixed(0)} ms`, accent: "from-indigo-500/20 to-indigo-500/5 ring-indigo-500/20" },
    { label: "Total Tokens", value: totalTokens.toLocaleString(), accent: "from-sky-500/20 to-sky-500/5 ring-sky-500/20" },
    { label: "Total Traces", value: totalTraces.toLocaleString(), accent: "from-emerald-500/20 to-emerald-500/5 ring-emerald-500/20" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`rounded-2xl bg-gradient-to-br ${c.accent} p-5 ring-1`}
        >
          <p className="text-sm text-gray-400">{c.label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-gray-100">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
