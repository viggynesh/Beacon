package main

import (
	"context"
	"fmt"
	"io"
	"os"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/cloudwatchlogs"
	"github.com/aws/aws-sdk-go-v2/service/cloudwatchlogs/types"
)

// cloudWatchLogger implements io.Writer so it can be used with log.SetOutput.
// It writes to both stdout and CloudWatch Logs.
type cloudWatchLogger struct {
	client   *cloudwatchlogs.Client
	logGroup string
	logStream string
	mu       sync.Mutex
}

func newCloudWatchLogger(ctx context.Context, logGroup, region string) (io.Writer, error) {
	cfg, err := config.LoadDefaultConfig(ctx, config.WithRegion(region))
	if err != nil {
		return nil, fmt.Errorf("load aws config: %w", err)
	}

	client := cloudwatchlogs.NewFromConfig(cfg)

	streamName := fmt.Sprintf("api-%d", time.Now().UnixMilli())

	// Ensure the log group exists.
	_, _ = client.CreateLogGroup(ctx, &cloudwatchlogs.CreateLogGroupInput{
		LogGroupName: &logGroup,
	})

	// Create a log stream for this process.
	_, err = client.CreateLogStream(ctx, &cloudwatchlogs.CreateLogStreamInput{
		LogGroupName:  &logGroup,
		LogStreamName: &streamName,
	})
	if err != nil {
		return nil, fmt.Errorf("create log stream: %w", err)
	}

	return &cloudWatchLogger{
		client:    client,
		logGroup:  logGroup,
		logStream: streamName,
	}, nil
}

func (c *cloudWatchLogger) Write(p []byte) (int, error) {
	// Always write to stdout.
	n, _ := os.Stdout.Write(p)

	msg := string(p)
	c.mu.Lock()
	defer c.mu.Unlock()

	_, err := c.client.PutLogEvents(context.Background(), &cloudwatchlogs.PutLogEventsInput{
		LogGroupName:  &c.logGroup,
		LogStreamName: &c.logStream,
		LogEvents: []types.InputLogEvent{
			{
				Message:   &msg,
				Timestamp: ptrInt64(time.Now().UnixMilli()),
			},
		},
	})
	if err != nil {
		// Don't fail the caller — just lose the CW write.
		fmt.Fprintf(os.Stderr, "cloudwatch put error: %v\n", err)
	}

	return n, nil
}

func ptrInt64(v int64) *int64 { return &v }
