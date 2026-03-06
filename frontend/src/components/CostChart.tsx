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
    <div className="rounded-xl bg-white p-4 shadow ring-1 ring-gray-200">
      <h2 className="mb-4 text-lg font-semibold">Cost per Model</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={stats}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="model" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v: number) => `$${v.toFixed(4)}`} />
          <Bar dataKey="total_cost_usd" fill="#6366f1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
