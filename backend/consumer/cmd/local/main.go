package main

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/kinesis"
	"github.com/aws/aws-sdk-go-v2/service/kinesis/types"
	"github.com/beacon/consumer/internal/consumer"
)

func main() {
	dsn := os.Getenv("CLICKHOUSE_DSN")
	bucket := os.Getenv("S3_BUCKET")
	region := os.Getenv("AWS_REGION")
	endpointURL := os.Getenv("AWS_ENDPOINT_URL")
	streamName := os.Getenv("BEACON_KINESIS_STREAM")

	if streamName == "" {
		log.Fatal("BEACON_KINESIS_STREAM is required")
	}

	ctx := context.Background()

	chConn, err := consumer.NewClickHouseConn(dsn)
	if err != nil {
		log.Fatalf("clickhouse connect: %v", err)
	}

	s3Client, err := consumer.NewS3Client(ctx, region, endpointURL)
	if err != nil {
		log.Fatalf("s3 client: %v", err)
	}

	// Build Kinesis client
	cfg, err := config.LoadDefaultConfig(ctx, config.WithRegion(region))
	if err != nil {
		log.Fatalf("load aws config: %v", err)
	}
	var kOpts []func(*kinesis.Options)
	if endpointURL != "" {
		kOpts = append(kOpts, func(o *kinesis.Options) {
			o.BaseEndpoint = aws.String(endpointURL)
		})
	}
	kClient := kinesis.NewFromConfig(cfg, kOpts...)

	// Track shard iterators across poll cycles
	shardIterators := map[string]*string{} // shardID -> iterator

	log.Printf("polling stream %s every 3s", streamName)

	for {
		// Discover shards
		listOut, err := kClient.ListShards(ctx, &kinesis.ListShardsInput{
			StreamName: aws.String(streamName),
		})
		if err != nil {
			log.Printf("ERROR list shards: %v", err)
			time.Sleep(3 * time.Second)
			continue
		}

		for _, shard := range listOut.Shards {
			shardID := *shard.ShardId

			// Get iterator if we don't have one for this shard
			if _, ok := shardIterators[shardID]; !ok {
				iterOut, err := kClient.GetShardIterator(ctx, &kinesis.GetShardIteratorInput{
					StreamName:        aws.String(streamName),
					ShardId:           aws.String(shardID),
					ShardIteratorType: types.ShardIteratorTypeTrimHorizon,
				})
				if err != nil {
					log.Printf("ERROR get shard iterator %s: %v", shardID, err)
					continue
				}
				shardIterators[shardID] = iterOut.ShardIterator
			}

			// Read records
			getOut, err := kClient.GetRecords(ctx, &kinesis.GetRecordsInput{
				ShardIterator: shardIterators[shardID],
				Limit:         aws.Int32(100),
			})
			if err != nil {
				log.Printf("ERROR get records shard %s: %v", shardID, err)
				delete(shardIterators, shardID) // force re-fetch iterator
				continue
			}

			// Advance iterator
			shardIterators[shardID] = getOut.NextShardIterator

			if len(getOut.Records) == 0 {
				continue
			}

			type parsed struct {
				trace   consumer.Trace
				rawJSON []byte
			}
			var traces []parsed

			for _, rec := range getOut.Records {
				var t consumer.Trace
				if err := json.Unmarshal(rec.Data, &t); err != nil {
					log.Printf("ERROR unmarshal record: %v", err)
					continue
				}
				traces = append(traces, parsed{trace: t, rawJSON: rec.Data})
			}

			if len(traces) == 0 {
				continue
			}

			// Batch insert into ClickHouse
			traceSlice := make([]consumer.Trace, len(traces))
			for i, p := range traces {
				traceSlice[i] = p.trace
			}
			if err := consumer.InsertTraces(ctx, chConn, traceSlice); err != nil {
				log.Printf("ERROR clickhouse insert: %v", err)
			}

			// Upload each trace to S3
			for _, p := range traces {
				if err := consumer.UploadTrace(ctx, s3Client, bucket, p.trace, p.rawJSON); err != nil {
					log.Printf("ERROR s3 upload trace %s: %v", p.trace.TraceID, err)
				}
			}

			log.Printf("shard %s: processed %d records", shardID, len(traces))
		}

		time.Sleep(3 * time.Second)
	}
}
