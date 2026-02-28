package main

import (
	"context"
	"encoding/json"
	"log"
	"os"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

func handler(ctx context.Context, event events.KinesisEvent) error {
	dsn := os.Getenv("CLICKHOUSE_DSN")
	bucket := os.Getenv("S3_BUCKET")
	region := os.Getenv("AWS_REGION")
	endpointURL := os.Getenv("AWS_ENDPOINT_URL")

	chConn, err := newClickHouseConn(dsn)
	if err != nil {
		log.Printf("ERROR clickhouse connect: %v", err)
		return nil
	}

	s3Client, err := newS3Client(ctx, region, endpointURL)
	if err != nil {
		log.Printf("ERROR s3 client: %v", err)
		return nil
	}

	type parsed struct {
		trace   Trace
		rawJSON []byte
	}
	var traces []parsed

	for _, record := range event.Records {
		raw := record.Kinesis.Data // already base64-decoded by the SDK

		var t Trace
		if err := json.Unmarshal(raw, &t); err != nil {
			log.Printf("ERROR unmarshal record %s: %v", record.EventID, err)
			continue
		}
		traces = append(traces, parsed{trace: t, rawJSON: raw})
	}

	if len(traces) == 0 {
		return nil
	}

	// Batch insert into ClickHouse
	traceSlice := make([]Trace, len(traces))
	for i, p := range traces {
		traceSlice[i] = p.trace
	}
	if err := insertTraces(ctx, chConn, traceSlice); err != nil {
		log.Printf("ERROR clickhouse insert: %v", err)
	}

	// Upload each trace to S3
	for _, p := range traces {
		if err := uploadTrace(ctx, s3Client, bucket, p.trace, p.rawJSON); err != nil {
			log.Printf("ERROR s3 upload trace %s: %v", p.trace.TraceID, err)
		}
	}

	return nil
}

func main() {
	lambda.Start(handler)
}
