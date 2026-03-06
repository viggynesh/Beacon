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

const tooltipStyle = {
  backgroundColor: "rgba(15, 23, 42, 0.95)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "10px",
  color: "#e2e8f0",
  fontSize: "12px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
};

export default function LatencyChart({ traces }: Props) {
  const sorted = [...traces].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const data = sorted.map((t) => ({
    timestamp: new Date(t.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    latency_ms: t.latency_ms,
  }));

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1e] p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-200">Latency Trend</h2>
          <p className="mt-0.5 text-xs text-gray-500">Response time over recent traces</p>
        </div>
        <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400">
          ms
        </span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="timestamp"
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            dy={8}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}`}
            dx={-4}
          />
          <Tooltip
            formatter={(v: number) => [`${v} ms`, "Latency"]}
            contentStyle={tooltipStyle}
            cursor={{ stroke: "rgba(129,140,248,0.3)" }}
          />
          <Area
            type="monotone"
            dataKey="latency_ms"
            stroke="#818cf8"
            strokeWidth={2}
            fill="url(#latencyGradient)"
            dot={false}
            activeDot={{ r: 4, fill: "#818cf8", stroke: "#0a0f1e", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
