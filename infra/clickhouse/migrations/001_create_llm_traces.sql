CREATE TABLE IF NOT EXISTS llm_traces
(
    trace_id           UUID,
    timestamp          DateTime,
    model              String,
    prompt_version     String,
    prompt_tokens      UInt32,
    completion_tokens  UInt32,
    total_tokens       UInt32,
    latency_ms         UInt32,
    cost_usd           Float64,
    hallucination_score Nullable(Float32),
    user_id            String,
    session_id         String,
    metadata           String
)
ENGINE = MergeTree
PARTITION BY toYYYYMMDD(timestamp)
ORDER BY (timestamp, model, prompt_version);
