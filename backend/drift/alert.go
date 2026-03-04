package main

import (
	"context"
	"time"
)

// Alerter sends drift alerts to an external system.
type Alerter interface {
	Alert(ctx context.Context, a Alert) error
}

// Alert represents a detected performance regression.
type Alert struct {
	PromptVersion string
	Metric        string
	BaselineValue float64
	CurrentValue  float64
	PctChange     float64
	Timestamp     time.Time
}
