export interface Trace {
  trace_id: string;
  timestamp: string;
  function: string;
  model: string;
  prompt_version: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  latency_ms: number;
  estimated_cost_usd: number;
  hallucination_score: number | null;
  user_id: string;
  session_id: string;
  metadata: Record<string, string>;
}

export interface ModelStats {
  model: string;
  total_cost_usd: number;
  avg_latency_ms: number;
  total_tokens: number;
  trace_count: number;
}
