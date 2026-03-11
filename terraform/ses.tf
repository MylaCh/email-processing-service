# SES email identities for sandbox mode
# Both sender and recipient must be verified in sandbox mode

resource "aws_ses_email_identity" "sender" {
  email = var.sender_email
}

resource "aws_ses_email_identity" "admin" {
  email = var.admin_email
}
