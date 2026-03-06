output "api_url" {
  description = "Public URL for the Beacon API"
  value       = "http://${aws_lb.api.dns_name}"
}

output "clickhouse_host" {
  description = "Private IP of the ClickHouse instance"
  value       = aws_instance.clickhouse.private_ip
}

output "kinesis_stream_arn" {
  description = "ARN of the beacon-traces Kinesis stream"
  value       = aws_kinesis_stream.traces.arn
}
