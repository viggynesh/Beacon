import type { ModelStats } from "../types";

interface Props {
  stats: ModelStats[];
}

const cardConfig = [
  {
    label: "Total Cost",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M8 1v14M11.5 3.5H6.25a2.25 2.25 0 000 4.5h3.5a2.25 2.25 0 010 4.5H4" />
      </svg>
    ),
    color: "text-violet-400",
    border: "border-violet-500/20",
    bg: "bg-violet-500/[0.06]",
    iconBg: "bg-violet-500/10",
  },
  {
    label: "Avg Latency",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="8" cy="8" r="6.5" /><path d="M8 4v4l2.5 2.5" />
      </svg>
    ),
    color: "text-indigo-400",
    border: "border-indigo-500/20",
    bg: "bg-indigo-500/[0.06]",
    iconBg: "bg-indigo-500/10",
  },
  {
    label: "Total Tokens",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M2 4h12M2 8h8M2 12h10" />
      </svg>
    ),
    color: "text-sky-400",
    border: "border-sky-500/20",
    bg: "bg-sky-500/[0.06]",
    iconBg: "bg-sky-500/10",
  },
  {
    label: "Total Traces",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M2 12l4-5 3 3 5-7" />
      </svg>
    ),
    color: "text-emerald-400",
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/[0.06]",
    iconBg: "bg-emerald-500/10",
  },
];

export default function StatsBar({ stats }: Props) {
  const totalCost = stats.reduce((sum, s) => sum + s.total_cost_usd, 0);
  const totalTokens = stats.reduce((sum, s) => sum + s.total_tokens, 0);
  const totalTraces = stats.reduce((sum, s) => sum + s.trace_count, 0);
  const weightedLatency =
    totalTraces > 0
      ? stats.reduce((sum, s) => sum + s.avg_latency_ms * s.trace_count, 0) / totalTraces
      : 0;

  const values = [
    `$${totalCost.toFixed(2)}`,
    `${weightedLatency.toFixed(0)}ms`,
    totalTokens.toLocaleString(),
    totalTraces.toLocaleString(),
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cardConfig.map((cfg, i) => (
        <div
          key={cfg.label}
          className={`card-glow rounded-xl border ${cfg.border} ${cfg.bg} p-4 transition-colors`}
        >
          <div className="flex items-center gap-2.5">
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${cfg.iconBg} ${cfg.color}`}>
              {cfg.icon}
            </div>
            <span className="text-xs font-medium text-gray-500">{cfg.label}</span>
          </div>
          <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-gray-100">
            {values[i]}
          </p>
        </div>
      ))}
    </div>
  );
}
