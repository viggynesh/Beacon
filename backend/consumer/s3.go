package main

import (
	"bytes"
	"context"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

func newS3Client(ctx context.Context, region, endpointURL string) (*s3.Client, error) {
	cfg, err := config.LoadDefaultConfig(ctx, config.WithRegion(region))
	if err != nil {
		return nil, fmt.Errorf("load aws config: %w", err)
	}

	var opts []func(*s3.Options)
	if endpointURL != "" {
		opts = append(opts, func(o *s3.Options) {
			o.BaseEndpoint = aws.String(endpointURL)
			o.UsePathStyle = true
		})
	}

	return s3.NewFromConfig(cfg, opts...), nil
}

func uploadTrace(ctx context.Context, client *s3.Client, bucket string, trace Trace, rawJSON []byte) error {
	key := fmt.Sprintf("%s/%s.json", trace.Timestamp.Format("2006/01/02"), trace.TraceID)
	_, err := client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(bucket),
		Key:         aws.String(key),
		Body:        bytes.NewReader(rawJSON),
		ContentType: aws.String("application/json"),
	})
	if err != nil {
		return fmt.Errorf("put object %s: %w", key, err)
	}
	return nil
}
