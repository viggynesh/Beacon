package main

import (
	"context"
	"fmt"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/google/uuid"
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

func insertTraces(ctx context.Context, conn driver.Conn, traces []Trace) error {
	batch, err := conn.PrepareBatch(ctx, `INSERT INTO llm_traces (
		trace_id, timestamp, model, prompt_version,
		prompt_tokens, completion_tokens, total_tokens,
		latency_ms, cost_usd, hallucination_score,
		user_id, session_id, metadata
	)`)
	if err != nil {
		return fmt.Errorf("prepare batch: %w", err)
	}

	for _, t := range traces {
		traceUUID, err := uuid.Parse(t.TraceID)
		if err != nil {
			return fmt.Errorf("parse trace_id %q: %w", t.TraceID, err)
		}
		if err := batch.Append(
			traceUUID,
			t.Timestamp,
			t.Model,
			t.PromptVersion,
			t.PromptTokens,
			t.CompletionTokens,
			t.TotalTokens,
			t.LatencyMs,
			t.CostUSD,
			t.HallucinationScore,
			t.UserID,
			t.SessionID,
			t.Metadata,
		); err != nil {
			return fmt.Errorf("append row: %w", err)
		}
	}

	if err := batch.Send(); err != nil {
		return fmt.Errorf("send batch: %w", err)
	}
	return nil
}
