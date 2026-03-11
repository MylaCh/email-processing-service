# --- Dead Letter Queue ---
# Captures messages that fail processing after max retries
resource "aws_sqs_queue" "dlq" {
  name                      = "${var.project_name}-dlq"
  message_retention_seconds = 1209600 # 14 days
}

# --- Main Processing Queue ---
# Receives job messages from the IMAP poller, consumed by the worker
resource "aws_sqs_queue" "processing" {
  name                       = "${var.project_name}-queue"
  visibility_timeout_seconds = 120 # 2 min - enough for LLM calls + S3 uploads
  message_retention_seconds  = 86400 # 1 day
  receive_wait_time_seconds  = 20 # long polling

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3
  })
}
