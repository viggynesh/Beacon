resource "aws_s3_bucket" "raw_traces" {
  bucket = "beacon-raw-traces-${var.environment}"

  tags = { Name = "beacon-raw-traces" }
}

resource "aws_s3_bucket_versioning" "raw_traces" {
  bucket = aws_s3_bucket.raw_traces.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "raw_traces" {
  bucket = aws_s3_bucket.raw_traces.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "raw_traces" {
  bucket = aws_s3_bucket.raw_traces.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
