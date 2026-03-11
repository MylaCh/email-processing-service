# Email Processing Service

An email classification service that receives emails via IMAP, classifies them using rules + LLM, and routes them to the appropriate handler.

## Test Email Address

Send test emails to: **mcemailprocessing@gmail.com**

## What Happens for Each Email Type

### Supplier File (Excel attachment)

When an email with an `.xlsx` attachment is received:

1. The attachment is parsed with `exceljs`
2. Column headers are sent to an LLM (OpenRouter) for fuzzy matching against the 5 required fields: Brand, Model Code, Color, Size, RRP
3. If all required fields are mapped, the file is uploaded to S3 under `supplier-files/{date}/{sender}_{filename}`
4. Metadata (column mapping, row count, sender, timestamp) is stored in DynamoDB

### Deal Question (customer service inquiry)

When an email contains a deal/order/pricing question:

1. The email subject + body are sent to an LLM for classification
2. An admin notification email is sent via AWS SES with the sender, subject, body preview, and classification confidence
3. Metadata (subject, body excerpt, confidence, reasoning) is stored in DynamoDB

### Other

Emails that don't match either category are stored in DynamoDB with classification metadata for review.

## Architecture

```
Gmail Inbox                           AWS
    │                                  ┌─────────────────────┐
    │ IMAP IDLE                        │ S3: raw-emails/     │
    ▼                                  │ S3: supplier-files/ │
┌──────────────┐    enqueue    ┌───────│ SQS queue + DLQ     │
│ IMAP Poller  │──────────────▶│       │ DynamoDB metadata   │
└──────────────┘  upload .eml  │       │ SES notifications   │
                               └───────└─────────────────────┘
                                  │
                                  │ poll
                                  ▼
                          ┌──────────────┐
                          │  SQS Worker  │
                          │  ┌─────────┐ │
                          │  │ Parser  │ │  mailparser + html-to-text
                          │  ├─────────┤ │
                          │  │Classify │ │  Rules (xlsx) + LLM (OpenRouter)
                          │  ├─────────┤ │
                          │  │  Route  │ │  S3 upload / SES notify / DynamoDB
                          │  └─────────┘ │
                          └──────────────┘
```

**Hybrid split**: Local backend handles all compute (parsing, classification, validation). AWS handles durable storage (S3, DynamoDB), async queueing (SQS), and outbound notifications (SES).

**Async design**: IMAP poller and SQS worker are decoupled via an SQS queue. The poller uploads raw emails to S3 and enqueues lightweight job messages. The worker consumes jobs independently, with automatic retry (3 attempts) and a dead letter queue for failures.

## Key Decisions

- **IMAP over webhooks**: No domain required. `imapflow` IDLE gives near-push latency. SQS queue provides the async decoupling that webhooks would naturally have.
- **SQS over Kafka**: Serverless, $0 at demo scale, no broker to manage. Kafka's ordering/replay guarantees aren't needed here.
- **LLM for column matching**: Supplier column names vary wildly ("Article Style" = "Model Code"). An LLM handles fuzzy matching more robustly than regex.
- **Rules + LLM hybrid**: Check for `.xlsx` first (free, instant) before calling the LLM. Minimizes API costs.
- **DynamoDB over SQLite**: Serverless, persists beyond local process lifetime, $0 at this scale.

## Setup

### Prerequisites

- Node.js 22+
- pnpm
- Terraform
- AWS account with CLI configured
- Gmail account with 2FA + App Password

### 1. Provision AWS Infrastructure

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your email addresses
terraform init
terraform apply
# Click SES verification links in your inbox
```

### 2. Configure Backend

```bash
cd backend
cp .env.example .env
# Fill in values from: terraform output
# Fill in IMAP credentials (Gmail App Password)
# Fill in OpenRouter API key
```

### 3. Install & Run

```bash
# From project root
pnpm install

# Start the service
cd backend
npx tsx src/index.ts
```

### 4. Test

Send an email to `mcemailprocessing@gmail.com`:

- **With an `.xlsx` supplier file** — watch the terminal for classification + S3 upload
- **With a deal/order question** — check admin inbox for SES notification

## Project Structure

```
├── terraform/                    # AWS infrastructure (S3, SQS, DynamoDB, SES, IAM)
│   ├── main.tf
│   ├── sqs.tf
│   ├── ses.tf
│   ├── iam.tf
│   ├── variables.tf
│   └── outputs.tf
├── backend/
│   └── src/
│       ├── index.ts              # Entry point: IMAP poller + SQS worker
│       ├── config.ts             # Environment configuration
│       ├── types.ts              # Shared TypeScript interfaces
│       ├── aws-clients.ts        # AWS SDK clients (S3, SQS, DynamoDB, SES)
│       ├── ingestion/
│       │   └── imap-poller.ts    # IMAP connection + IDLE, upload to S3, enqueue SQS
│       ├── queue/
│       │   ├── sqs-client.ts     # SQS send/receive/delete helpers
│       │   └── sqs-worker.ts     # SQS consumer, dispatches to pipeline
│       ├── preprocessor/
│       │   └── email-parser.ts   # MIME parsing, text extraction, attachment handling
│       ├── classifier/
│       │   ├── index.ts          # Classification orchestrator (rules → LLM)
│       │   ├── rules-engine.ts   # Attachment-based pre-classification
│       │   ├── supplier-validator.ts  # Excel parsing + LLM column matching
│       │   └── llm-classifier.ts # OpenRouter LLM for deal question detection
│       └── postprocessor/
│           ├── index.ts          # Router: dispatch to correct handler
│           ├── supplier-handler.ts    # Upload xlsx to S3, store metadata
│           ├── deal-question-handler.ts  # SES notification, store metadata
│           ├── notification.ts   # SES email sending
│           └── metadata-store.ts # DynamoDB storage helper
└── SUPPLIER_FILE.md              # Supplier file specification
```
