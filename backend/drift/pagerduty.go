package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

const pagerdutyEventsURL = "https://events.pagerduty.com/v2/enqueue"

// PagerDutyAlerter sends drift alerts via PagerDuty Events API v2.
type PagerDutyAlerter struct {
	RoutingKey string
	Client     *http.Client
}

type pdEvent struct {
	RoutingKey  string    `json:"routing_key"`
	EventAction string    `json:"event_action"`
	Payload     pdPayload `json:"payload"`
}

type pdPayload struct {
	Summary  string `json:"summary"`
	Source   string `json:"source"`
	Severity string `json:"severity"`
}

func (p *PagerDutyAlerter) Alert(ctx context.Context, a Alert) error {
	event := pdEvent{
		RoutingKey:  p.RoutingKey,
		EventAction: "trigger",
		Payload: pdPayload{
			Summary: fmt.Sprintf("Drift: %s %s baseline=%.4f current=%.4f (%s)",
				a.PromptVersion, a.Metric, a.BaselineValue, a.CurrentValue, formatPctChange(a.PctChange)),
			Source:   "beacon-drift",
			Severity: "warning",
		},
	}

	body, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("marshal pagerduty event: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, pagerdutyEventsURL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create pagerduty request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.Client.Do(req)
	if err != nil {
		return fmt.Errorf("post to pagerduty: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusAccepted {
		return fmt.Errorf("pagerduty returned status %d", resp.StatusCode)
	}
	return nil
}
