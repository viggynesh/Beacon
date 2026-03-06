package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

// SlackAlerter posts drift alerts to a Slack incoming webhook.
type SlackAlerter struct {
	WebhookURL string
	Client     *http.Client
}

type slackMessage struct {
	Text string `json:"text"`
}

func (s *SlackAlerter) Alert(ctx context.Context, a Alert) error {
	text := fmt.Sprintf(
		":warning: *Drift Detected*\n"+
			"*Prompt Version:* `%s`\n"+
			"*Metric:* %s\n"+
			"*Baseline:* %.4f → *Current:* %.4f (%s)",
		a.PromptVersion, a.Metric, a.BaselineValue, a.CurrentValue, formatPctChange(a.PctChange),
	)

	body, err := json.Marshal(slackMessage{Text: text})
	if err != nil {
		return fmt.Errorf("marshal slack message: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.WebhookURL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create slack request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.Client.Do(req)
	if err != nil {
		return fmt.Errorf("post to slack: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("slack returned status %d", resp.StatusCode)
	}
	return nil
}
