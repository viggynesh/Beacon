import type { Trace } from "../types";

interface Props {
  trace: Trace;
  onClose: () => void;
}

const phases = [
  { label: "Prompt Processing", pct: 0.2, color: "bg-violet-500" },
  { label: "Model Inference", pct: 0.7, color: "bg-indigo-500" },
  { label: "Response Parsing", pct: 0.1, color: "bg-sky-500" },
];

export default function TraceDetail({ trace, onClose }: Props) {
  const totalMs = trace.latency_ms;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-2xl rounded-2xl bg-[#0f1629] text-gray-100 shadow-2xl ring-1 ring-white/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-lg font-semibold tracking-tight">Trace Detail</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-white/10 hover:text-white"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          {/* Waterfall */}
          <div>
            <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-400">
              Latency Waterfall
              <span className="ml-2 text-xs font-normal normal-case text-gray-500">({totalMs} ms total)</span>
            </h3>
            <div className="space-y-2.5">
              {phases.map((phase) => {
                const ms = Math.round(totalMs * phase.pct);
                const widthPct = Math.max(phase.pct * 100, 4);
                return (
                  <div key={phase.label}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-gray-300">{phase.label}</span>
                      <span className="tabular-nums text-gray-400">{ms} ms</span>
                    </div>
                    <div className="h-5 w-full overflow-hidden rounded-md bg-white/5">
                      <div
                        className={`${phase.color} h-full rounded-md transition-all duration-500`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div className="mt-3 flex gap-4 text-xs text-gray-500">
              {phases.map((phase) => (
                <span key={phase.label} className="flex items-center gap-1.5">
                  <span className={`inline-block h-2 w-2 rounded-full ${phase.color}`} />
                  {Math.round(phase.pct * 100)}%
                </span>
              ))}
            </div>
          </div>

          {/* Metadata */}
          <div>
            <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-400">Metadata</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <MetaRow label="Trace ID" value={trace.trace_id} mono />
              <MetaRow label="Timestamp" value={new Date(trace.timestamp).toLocaleString()} />
              <MetaRow label="Model" value={trace.model} />
              <MetaRow label="Prompt Version" value={trace.prompt_version} />
              <MetaRow label="Prompt Tokens" value={trace.prompt_tokens.toLocaleString()} />
              <MetaRow label="Completion Tokens" value={trace.completion_tokens.toLocaleString()} />
              <MetaRow label="Total Tokens" value={trace.total_tokens.toLocaleString()} />
              <MetaRow label="Latency" value={`${trace.latency_ms} ms`} />
              <MetaRow label="Cost" value={`$${trace.estimated_cost_usd.toFixed(4)}`} />
              {trace.hallucination_score != null && (
                <MetaRow label="Hallucination Score" value={trace.hallucination_score.toFixed(3)} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col py-1">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-gray-200 ${mono ? "font-mono text-xs break-all" : ""}`}>{value}</span>
    </div>
  );
}
