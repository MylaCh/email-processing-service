variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "eu-central-1"
}

variable "project_name" {
  description = "Project name used as prefix for all resources"
  type        = string
  default     = "email-processing"
}

variable "admin_email" {
  description = "Admin email address for deal question notifications (must be verified in SES)"
  type        = string
}

variable "sender_email" {
  description = "Email address used as the From address for SES notifications (must be verified in SES)"
  type        = string
}
