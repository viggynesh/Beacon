variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "clickhouse_password" {
  description = "Password for the ClickHouse beacon user"
  type        = string
  sensitive   = true
}
