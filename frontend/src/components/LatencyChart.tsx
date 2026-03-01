import {
  LineChart,
  Line,
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
    <div className="rounded-xl bg-white p-4 shadow ring-1 ring-gray-200">
      <h2 className="mb-4 text-lg font-semibold">Latency Trend</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v: number) => `${v} ms`} />
          <Line
            type="monotone"
            dataKey="latency_ms"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
