package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

const driftQuery = `
WITH ranked AS (
  SELECT prompt_version, latency_ms, cost_usd,
    ROW_NUMBER() OVER (PARTITION BY prompt_version ORDER BY timestamp DESC) AS rn
  FROM llm_traces
  WHERE timestamp > now() - INTERVAL 7 DAY
),
current_window AS (
  SELECT prompt_version, avg(latency_ms) AS avg_latency, avg(cost_usd) AS avg_cost
  FROM ranked WHERE rn <= 100 GROUP BY prompt_version
),
baseline_window AS (
  SELECT prompt_version, avg(latency_ms) AS avg_latency, avg(cost_usd) AS avg_cost
  FROM ranked WHERE rn > 100 AND rn <= 200 GROUP BY prompt_version
)
SELECT c.prompt_version,
  c.avg_latency AS curr_latency, b.avg_latency AS base_latency,
  c.avg_cost AS curr_cost, b.avg_cost AS base_cost
FROM current_window c
INNER JOIN baseline_window b ON c.prompt_version = b.prompt_version
`

type driftRow struct {
	PromptVersion string
	CurrLatency   float64
	BaseLatency   float64
	CurrCost      float64
	BaseCost      float64
}

func checkDrift(ctx context.Context, conn driver.Conn, threshold float64, alerters []Alerter) {
	rows, err := conn.Query(ctx, driftQuery)
	if err != nil {
		log.Printf("ERROR drift query: %v", err)
		return
	}
	defer rows.Close()

	now := time.Now()
	var alertCount int

	for rows.Next() {
		var r driftRow
		if err := rows.Scan(&r.PromptVersion, &r.CurrLatency, &r.BaseLatency, &r.CurrCost, &r.BaseCost); err != nil {
			log.Printf("ERROR scanning row: %v", err)
			continue
		}

		if r.BaseLatency > 0 {
			pct := (r.CurrLatency - r.BaseLatency) / r.BaseLatency
			if pct > threshold {
				fireAlert(ctx, alerters, Alert{
					PromptVersion: r.PromptVersion,
					Metric:        "latency_ms",
					BaselineValue: r.BaseLatency,
					CurrentValue:  r.CurrLatency,
					PctChange:     pct,
					Timestamp:     now,
				})
				alertCount++
			}
		}

		if r.BaseCost > 0 {
			pct := (r.CurrCost - r.BaseCost) / r.BaseCost
			if pct > threshold {
				fireAlert(ctx, alerters, Alert{
					PromptVersion: r.PromptVersion,
					Metric:        "cost_usd",
					BaselineValue: r.BaseCost,
					CurrentValue:  r.CurrCost,
					PctChange:     pct,
					Timestamp:     now,
				})
				alertCount++
			}
		}
	}

	if err := rows.Err(); err != nil {
		log.Printf("ERROR iterating rows: %v", err)
	}

	if alertCount == 0 {
		log.Println("drift check complete — no regressions detected")
	} else {
		log.Printf("drift check complete — %d alert(s) fired", alertCount)
	}
}

func fireAlert(ctx context.Context, alerters []Alerter, a Alert) {
	log.Printf("DRIFT DETECTED: %s %s baseline=%.4f current=%.4f change=+%.1f%%",
		a.PromptVersion, a.Metric, a.BaselineValue, a.CurrentValue, a.PctChange*100)

	for _, alerter := range alerters {
		if err := alerter.Alert(ctx, a); err != nil {
			log.Printf("ERROR sending alert via %T: %v", alerter, err)
		}
	}
}

func formatPctChange(pct float64) string {
	return fmt.Sprintf("+%.1f%%", pct*100)
}
