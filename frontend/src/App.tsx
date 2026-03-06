import { useEffect, useState, useCallback } from "react";
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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(() => {
    Promise.all([fetchTraces(100), fetchStats()])
      .then(([t, s]) => {
        setTraces(t);
        setStats(s);
        setLastUpdated(new Date());
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, [load]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#060a14]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-400" />
            <div className="absolute inset-2 animate-spin rounded-full border-2 border-violet-500/30 border-b-violet-400" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
          </div>
          <span className="text-sm font-medium text-gray-500">Loading Beacon...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#060a14]">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-8 py-6 text-center">
          <p className="text-sm font-medium text-red-400">Connection Error</p>
          <p className="mt-1 text-xs text-red-400/60">{error}</p>
          <button onClick={load} className="mt-4 rounded-lg bg-red-500/10 px-4 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/20">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060a14] text-gray-100">
      {/* Top nav bar */}
      <nav className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#060a14]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="white">
                <circle cx="10" cy="10" r="3" />
                <circle cx="10" cy="10" r="7" fill="none" stroke="white" strokeWidth="1.5" />
              </svg>
            </div>
            <span className="text-base font-semibold tracking-tight">Beacon</span>
            <span className="hidden sm:inline-flex rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-gray-500">
              Observability
            </span>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="flex items-center gap-2 text-[11px] text-gray-500">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="live-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                Live
              </span>
            )}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="mx-auto max-w-screen-2xl px-6 py-6 space-y-6">
        <StatsBar stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CostChart stats={stats} />
          <LatencyChart traces={traces} />
        </div>

        <TracesTable traces={traces} onSelect={setSelectedTrace} />
      </main>

      {selectedTrace && (
        <TraceDetail trace={selectedTrace} onClose={() => setSelectedTrace(null)} />
      )}
    </div>
  );
}
