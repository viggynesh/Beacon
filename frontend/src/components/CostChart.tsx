import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ModelStats } from "../types";

interface Props {
  stats: ModelStats[];
}

const tooltipStyle = {
  backgroundColor: "rgba(15, 23, 42, 0.95)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "10px",
  color: "#e2e8f0",
  fontSize: "12px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
};

export default function CostChart({ stats }: Props) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1e] p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-200">Cost by Model</h2>
          <p className="mt-0.5 text-xs text-gray-500">Total spend per LLM</p>
        </div>
        <span className="rounded-md bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-400">
          USD
        </span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={stats} barCategoryGap="30%">
          <defs>
            <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0.8} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="model"
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            dy={8}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${v}`}
            dx={-4}
          />
          <Tooltip
            formatter={(v: number) => [`$${v.toFixed(4)}`, "Cost"]}
            contentStyle={tooltipStyle}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
          />
          <Bar dataKey="total_cost_usd" fill="url(#costGradient)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
