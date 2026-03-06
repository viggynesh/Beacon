package main

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func unavailable(w http.ResponseWriter) {
	writeJSON(w, http.StatusServiceUnavailable, map[string]string{
		"error": "ClickHouse is not available",
	})
}

func healthHandler(conn driver.Conn) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if conn == nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "degraded", "clickhouse": "not connected"})
			return
		}
		if err := conn.Ping(r.Context()); err != nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "degraded", "clickhouse": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "clickhouse": "connected"})
	}
}

func tracesHandler(conn driver.Conn) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if conn == nil {
			unavailable(w)
			return
		}

		q := r.URL.Query()
		var f TraceFilters

		f.Model = q.Get("model")
		f.PromptVersion = q.Get("prompt_version")

		if v := q.Get("start_time"); v != "" {
			t, err := time.Parse(time.RFC3339, v)
			if err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid start_time: must be RFC3339"})
				return
			}
			f.StartTime = &t
		}
		if v := q.Get("end_time"); v != "" {
			t, err := time.Parse(time.RFC3339, v)
			if err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid end_time: must be RFC3339"})
				return
			}
			f.EndTime = &t
		}
		if v := q.Get("limit"); v != "" {
			n, err := strconv.Atoi(v)
			if err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid limit: must be integer"})
				return
			}
			f.Limit = n
		}

		traces, err := queryTraces(r.Context(), conn, f)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}

		if traces == nil {
			traces = []Trace{}
		}
		writeJSON(w, http.StatusOK, traces)
	}
}

func statsHandler(conn driver.Conn) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if conn == nil {
			unavailable(w)
			return
		}

		stats, err := queryStats(r.Context(), conn)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}

		if stats == nil {
			stats = []ModelStats{}
		}
		writeJSON(w, http.StatusOK, stats)
	}
}

func modelsHandler(conn driver.Conn) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if conn == nil {
			unavailable(w)
			return
		}

		models, err := queryModels(r.Context(), conn)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}

		if models == nil {
			models = []string{}
		}
		writeJSON(w, http.StatusOK, models)
	}
}
