import type { Trace } from "../types";

interface Props {
  trace: Trace;
  onClose: () => void;
}

const phases = [
  { label: "Prompt Processing", pct: 0.2, color: "bg-violet-500", textColor: "text-violet-400" },
  { label: "Model Inference", pct: 0.7, color: "bg-indigo-500", textColor: "text-indigo-400" },
  { label: "Response Parsing", pct: 0.1, color: "bg-sky-500", textColor: "text-sky-400" },
];

export default function TraceDetail({ trace, onClose }: Props) {
  const totalMs = trace.latency_ms;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative mx-4 w-full max-w-2xl rounded-2xl border border-white/[0.08] bg-[#0a0f1e] text-gray-100 shadow-2xl shadow-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-200">Trace Detail</h2>
            <p className="mt-0.5 font-mono text-[11px] text-gray-500">{trace.trace_id}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 transition hover:bg-white/[0.06] hover:text-gray-300"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* Waterfall */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[11px] font-medium uppercase tracking-widest text-gray-500">Latency Waterfall</h3>
              <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium tabular-nums text-indigo-400">
                {totalMs}ms total
              </span>
            </div>
            <div className="space-y-2">
              {phases.map((phase) => {
                const ms = Math.round(totalMs * phase.pct);
                const widthPct = Math.max(phase.pct * 100, 4);
                return (
                  <div key={phase.label}>
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className="text-gray-400">{phase.label}</span>
                      <span className={`tabular-nums ${phase.textColor}`}>{ms}ms</span>
                    </div>
                    <div className="h-4 w-full overflow-hidden rounded-md bg-white/[0.04]">
                      <div
                        className={`${phase.color} waterfall-bar h-full rounded-md`}
                        style={{ width: `${widthPct}%`, opacity: 0.85 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2.5 flex gap-4 text-[10px] text-gray-600">
              {phases.map((phase) => (
                <span key={phase.label} className="flex items-center gap-1">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${phase.color}`} />
                  {Math.round(phase.pct * 100)}%
                </span>
              ))}
            </div>
          </div>

          <div className="h-px bg-white/[0.06]" />

          {/* Metadata */}
          <div>
            <h3 className="mb-3 text-[11px] font-medium uppercase tracking-widest text-gray-500">Metadata</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <MetaRow label="Timestamp" value={new Date(trace.timestamp).toLocaleString()} />
              <MetaRow label="Model" value={trace.model} highlight />
              <MetaRow label="Prompt Version" value={trace.prompt_version} />
              <MetaRow label="Latency" value={`${trace.latency_ms}ms`} />
              <MetaRow label="Prompt Tokens" value={trace.prompt_tokens.toLocaleString()} />
              <MetaRow label="Completion Tokens" value={trace.completion_tokens.toLocaleString()} />
              <MetaRow label="Total Tokens" value={trace.total_tokens.toLocaleString()} />
              <MetaRow label="Cost" value={`$${trace.estimated_cost_usd.toFixed(4)}`} />
              {trace.hallucination_score != null && (
                <MetaRow
                  label="Hallucination Score"
                  value={trace.hallucination_score.toFixed(3)}
                  warn={trace.hallucination_score > 0.5}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value, highlight, warn }: { label: string; value: string; highlight?: boolean; warn?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-gray-500">{label}</span>
      <span
        className={`text-[13px] ${
          warn ? "font-medium text-amber-400" : highlight ? "font-medium text-gray-100" : "text-gray-300"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
