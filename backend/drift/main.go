package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
)

func main() {
	dsn := os.Getenv("CLICKHOUSE_DSN")
	if dsn == "" {
		log.Fatal("CLICKHOUSE_DSN is required")
	}

	interval := 5 * time.Minute
	if v := os.Getenv("DRIFT_INTERVAL"); v != "" {
		d, err := time.ParseDuration(v)
		if err != nil {
			log.Fatalf("invalid DRIFT_INTERVAL %q: %v", v, err)
		}
		interval = d
	}

	threshold := 0.2
	if v := os.Getenv("DRIFT_THRESHOLD"); v != "" {
		var t float64
		if _, err := fmt.Sscanf(v, "%f", &t); err != nil {
			log.Fatalf("invalid DRIFT_THRESHOLD %q: %v", v, err)
		}
		threshold = t
	}

	opts, err := clickhouse.ParseDSN(dsn)
	if err != nil {
		log.Fatalf("parse ClickHouse DSN: %v", err)
	}

	conn, err := clickhouse.Open(opts)
	if err != nil {
		log.Fatalf("open ClickHouse: %v", err)
	}
	if err := conn.Ping(context.Background()); err != nil {
		log.Fatalf("ping ClickHouse: %v", err)
	}
	log.Println("connected to ClickHouse")

	var alerters []Alerter
	httpClient := &http.Client{Timeout: 10 * time.Second}

	if url := os.Getenv("SLACK_WEBHOOK_URL"); url != "" {
		alerters = append(alerters, &SlackAlerter{WebhookURL: url, Client: httpClient})
		log.Println("Slack alerter enabled")
	}
	if key := os.Getenv("PAGERDUTY_ROUTING_KEY"); key != "" {
		alerters = append(alerters, &PagerDutyAlerter{RoutingKey: key, Client: httpClient})
		log.Println("PagerDuty alerter enabled")
	}

	if len(alerters) == 0 {
		log.Println("WARNING: no alerters configured — drift will be logged only")
	}

	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	log.Printf("starting drift detection (interval=%s, threshold=%.0f%%)", interval, threshold*100)

	// Run immediately on startup, then on ticker.
	checkDrift(ctx, conn, threshold, alerters)

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("shutting down")
			return
		case <-ticker.C:
			checkDrift(ctx, conn, threshold, alerters)
		}
	}
}
