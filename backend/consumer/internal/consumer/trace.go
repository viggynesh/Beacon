package consumer

import "time"

// Trace represents an LLM trace record from the SDK.
type Trace struct {
	TraceID            string    `json:"trace_id"`
	Timestamp          time.Time `json:"timestamp"`
	Function           string    `json:"function"`
	Model              string    `json:"model"`
	PromptVersion      string    `json:"prompt_version"`
	PromptTokens       uint32    `json:"prompt_tokens"`
	CompletionTokens   uint32    `json:"completion_tokens"`
	TotalTokens        uint32    `json:"total_tokens"`
	LatencyMs          float64   `json:"latency_ms"`
	CostUSD            float64   `json:"estimated_cost_usd"`
	HallucinationScore *float64  `json:"hallucination_score"`
	UserID             string    `json:"user_id"`
	SessionID          string    `json:"session_id"`
	Metadata           map[string]string `json:"metadata"`
}
