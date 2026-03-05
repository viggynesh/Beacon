import { useEffect, useState } from "react";
import type { Trace, ModelStats } from "./types";
import { fetchTraces, fetchStats } from "./api";
import StatsBar from "./components/StatsBar";
import CostChart from "./components/CostChart";
import LatencyChart from "./components/LatencyChart";
import TracesTable from "./components/TracesTable";
import TraceDetail from "./components/TraceDetail";

export default function App() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [stats, setStats] = useState<ModelStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null);

  useEffect(() => {
    Promise.all([fetchTraces(100), fetchStats()])
      .then(([t, s]) => {
        setTraces(t);
        setStats(s);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#080d1c] text-gray-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <span className="text-sm">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#080d1c] text-red-400">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080d1c] px-6 py-8 text-gray-100">
      <header className="mb-8 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <circle cx="10" cy="10" r="3" />
            <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="10" cy="10" r="10" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.4" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Beacon</h1>
        <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-gray-500 ring-1 ring-white/10">
          Dashboard
        </span>
      </header>

      <div className="space-y-6">
        <StatsBar stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CostChart stats={stats} />
          <LatencyChart traces={traces} />
        </div>

        <div>
          <h2 className="mb-3 text-base font-semibold text-gray-100">Recent Traces</h2>
          <TracesTable traces={traces} onSelect={setSelectedTrace} />
        </div>
      </div>

      {selectedTrace && (
        <TraceDetail trace={selectedTrace} onClose={() => setSelectedTrace(null)} />
      )}
    </div>
  );
}
