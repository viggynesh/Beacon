package main

import (
	"context"
	"fmt"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

func newClickHouseConn(dsn string) (driver.Conn, error) {
	opts, err := clickhouse.ParseDSN(dsn)
	if err != nil {
		return nil, fmt.Errorf("parse clickhouse dsn: %w", err)
	}
	conn, err := clickhouse.Open(opts)
	if err != nil {
		return nil, fmt.Errorf("open clickhouse conn: %w", err)
	}
	return conn, nil
}

// TraceFilters holds optional query parameters for filtering traces.
type TraceFilters struct {
	Model         string
	PromptVersion string
	StartTime     *time.Time
	EndTime       *time.Time
	Limit         int
}

func queryTraces(ctx context.Context, conn driver.Conn, f TraceFilters) ([]Trace, error) {
	query := `SELECT
		trace_id, timestamp, model, prompt_version,
		prompt_tokens, completion_tokens, total_tokens,
		latency_ms, cost_usd, hallucination_score,
		user_id, session_id, metadata
	FROM llm_traces`

	var conditions []string
	var args []interface{}

	if f.Model != "" {
		conditions = append(conditions, "model = ?")
		args = append(args, f.Model)
	}
	if f.PromptVersion != "" {
		conditions = append(conditions, "prompt_version = ?")
		args = append(args, f.PromptVersion)
	}
	if f.StartTime != nil {
		conditions = append(conditions, "timestamp >= ?")
		args = append(args, *f.StartTime)
	}
	if f.EndTime != nil {
		conditions = append(conditions, "timestamp <= ?")
		args = append(args, *f.EndTime)
	}

	for i, cond := range conditions {
		if i == 0 {
			query += " WHERE " + cond
		} else {
			query += " AND " + cond
		}
	}

	query += " ORDER BY timestamp DESC"

	limit := f.Limit
	if limit <= 0 {
		limit = 50
	}
	if limit > 1000 {
		limit = 1000
	}
	query += fmt.Sprintf(" LIMIT %d", limit)

	rows, err := conn.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query traces: %w", err)
	}
	defer rows.Close()

	var traces []Trace
	for rows.Next() {
		var t Trace
		if err := rows.Scan(
			&t.TraceID, &t.Timestamp, &t.Model, &t.PromptVersion,
			&t.PromptTokens, &t.CompletionTokens, &t.TotalTokens,
			&t.LatencyMs, &t.CostUSD, &t.HallucinationScore,
			&t.UserID, &t.SessionID, &t.Metadata,
		); err != nil {
			return nil, fmt.Errorf("scan trace row: %w", err)
		}
		traces = append(traces, t)
	}
	return traces, nil
}

func queryStats(ctx context.Context, conn driver.Conn) ([]ModelStats, error) {
	rows, err := conn.Query(ctx, `
		SELECT
			model,
			sum(cost_usd)        AS total_cost_usd,
			avg(latency_ms)      AS avg_latency_ms,
			sum(total_tokens)    AS total_tokens,
			count()              AS trace_count
		FROM llm_traces
		GROUP BY model
		ORDER BY trace_count DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("query stats: %w", err)
	}
	defer rows.Close()

	var stats []ModelStats
	for rows.Next() {
		var s ModelStats
		if err := rows.Scan(&s.Model, &s.TotalCostUSD, &s.AvgLatencyMs, &s.TotalTokens, &s.TraceCount); err != nil {
			return nil, fmt.Errorf("scan stats row: %w", err)
		}
		stats = append(stats, s)
	}
	return stats, nil
}

func queryModels(ctx context.Context, conn driver.Conn) ([]string, error) {
	rows, err := conn.Query(ctx, `SELECT DISTINCT model FROM llm_traces ORDER BY model`)
	if err != nil {
		return nil, fmt.Errorf("query models: %w", err)
	}
	defer rows.Close()

	var models []string
	for rows.Next() {
		var m string
		if err := rows.Scan(&m); err != nil {
			return nil, fmt.Errorf("scan model row: %w", err)
		}
		models = append(models, m)
	}
	return models, nil
}
