resource "aws_kinesis_stream" "traces" {
  name             = "beacon-traces"
  shard_count      = 2
  retention_period = 24

  stream_mode_details {
    stream_mode = "PROVISIONED"
  }

  tags = { Name = "beacon-traces" }
}
