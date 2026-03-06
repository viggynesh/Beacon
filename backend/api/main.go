package main

import (
	"log"
	"net/http"
	"os"

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

	conn, err := newClickHouseConn(dsn)
	if err != nil {
		log.Fatalf("clickhouse connection failed: %v", err)
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
