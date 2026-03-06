import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Trace } from "../types";

interface Props {
  traces: Trace[];
}

export default function LatencyChart({ traces }: Props) {
  const sorted = [...traces].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const data = sorted.map((t) => ({
    timestamp: new Date(t.timestamp).toLocaleTimeString(),
    latency_ms: t.latency_ms,
  }));

  return (
    <div className="rounded-2xl bg-[#0f1629] p-5 shadow-xl ring-1 ring-white/10">
      <h2 className="mb-4 text-base font-semibold text-gray-100">Latency Trend</h2>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="timestamp" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(v: number) => `${v} ms`}
            contentStyle={{ backgroundColor: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.75rem", color: "#e5e7eb" }}
            itemStyle={{ color: "#a5b4fc" }}
          />
          <Area
            type="monotone"
            dataKey="latency_ms"
            stroke="#818cf8"
            strokeWidth={2}
            fill="url(#latencyGradient)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
