package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func main() {
	dsn := os.Getenv("CLICKHOUSE_DSN")
	if dsn == "" {
		log.Fatal("CLICKHOUSE_DSN is required")
	}

	port := os.Getenv("BACKEND_PORT")
	if port == "" {
		port = "8080"
	}

	// Set up CloudWatch logger if configured.
	if logGroup := os.Getenv("CLOUDWATCH_LOG_GROUP"); logGroup != "" {
		region := os.Getenv("AWS_REGION")
		if region == "" {
			region = "us-east-1"
		}
		cwl, err := newCloudWatchLogger(context.Background(), logGroup, region)
		if err != nil {
			log.Printf("WARNING: failed to init CloudWatch logger: %v — continuing with stdout only", err)
		} else {
			log.SetOutput(cwl)
			log.Printf("CloudWatch logging enabled (group=%s)", logGroup)
		}
	}

	// Attempt ClickHouse connection — continue in degraded mode on failure.
	var conn driver.Conn
	c, err := newClickHouseConn(dsn)
	if err != nil {
		log.Printf("WARNING: ClickHouse unreachable: %v — starting in degraded mode", err)
	} else {
		if err := c.Ping(context.Background()); err != nil {
			log.Printf("WARNING: ClickHouse ping failed: %v — starting in degraded mode", err)
		} else {
			conn = c
			log.Println("connected to ClickHouse")
		}
	}

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Content-Type"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	r.Get("/health", healthHandler(conn))
	r.Get("/api/traces", tracesHandler(conn))
	r.Get("/api/stats", statsHandler(conn))
	r.Get("/api/models", modelsHandler(conn))

	log.Printf("starting beacon API on :%s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
