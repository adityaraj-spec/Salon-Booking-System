variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "AWS region for primary deployment"
}

variable "environment" {
  type        = string
  default     = "production"
  description = "Environment tag (e.g. production, staging, dev)"
}
