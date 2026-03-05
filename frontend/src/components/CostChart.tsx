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

export default function CostChart({ stats }: Props) {
  return (
    <div className="rounded-2xl bg-[#0f1629] p-5 shadow-xl ring-1 ring-white/10">
      <h2 className="mb-4 text-base font-semibold text-gray-100">Cost per Model</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={stats}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="model" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(v: number) => `$${v.toFixed(4)}`}
            contentStyle={{ backgroundColor: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.75rem", color: "#e5e7eb" }}
            itemStyle={{ color: "#c4b5fd" }}
          />
          <Bar dataKey="total_cost_usd" fill="url(#costGradient)" radius={[6, 6, 0, 0]} />
          <defs>
            <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
