output "s3_bucket_name" {
  description = "S3 bucket name for emails and supplier files"
  value       = aws_s3_bucket.emails.id
}

output "sqs_queue_url" {
  description = "SQS processing queue URL"
  value       = aws_sqs_queue.processing.url
}

output "sqs_dlq_url" {
  description = "SQS dead letter queue URL"
  value       = aws_sqs_queue.dlq.url
}

output "dynamodb_table_name" {
  description = "DynamoDB metadata table name"
  value       = aws_dynamodb_table.metadata.name
}

output "iam_access_key_id" {
  description = "IAM access key ID for the service user"
  value       = aws_iam_access_key.service.id
}

output "iam_secret_access_key" {
  description = "IAM secret access key for the service user"
  value       = aws_iam_access_key.service.secret
  sensitive   = true
}

output "aws_region" {
  description = "AWS region"
  value       = var.aws_region
}
