import { useEffect, useState } from "react";
import type { Trace, ModelStats } from "./types";
import { fetchTraces, fetchStats } from "./api";
import StatsBar from "./components/StatsBar";
import CostChart from "./components/CostChart";
import LatencyChart from "./components/LatencyChart";
import TracesTable from "./components/TracesTable";

export default function App() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [stats, setStats] = useState<ModelStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <div className="flex h-screen items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-red-600">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="mb-6 text-2xl font-bold">Beacon Dashboard</h1>

      <div className="space-y-6">
        <StatsBar stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CostChart stats={stats} />
          <LatencyChart traces={traces} />
        </div>

        <TracesTable traces={traces} />
      </div>
    </div>
  );
}
