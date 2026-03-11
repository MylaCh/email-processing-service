import { config } from "./config";
import { startImapPoller, stopImapPoller } from "./ingestion/imap-poller";
import { startWorker, stopWorker } from "./queue/sqs-worker";
import { parseEmail } from "./preprocessor/email-parser";
import { classifyEmail } from "./classifier";
import { routeEmail } from "./postprocessor";
import type { SqsJobMessage } from "./types";

async function processEmail(job: SqsJobMessage, rawEmail: Buffer): Promise<void> {
  console.log(
    `[Pipeline] Processing email: messageId=${job.messageId} size=${rawEmail.length} bytes`
  );

  const parsed = await parseEmail(rawEmail);
  console.log(`[Pipeline] Parsed: from=${parsed.from} subject="${parsed.subject}"`);
  console.log(`[Pipeline] Body (first 200 chars): ${parsed.textContent.slice(0, 200)}`);
  console.log(
    `[Pipeline] Attachments: ${parsed.attachments.length === 0 ? "none" : parsed.attachments.map((a) => `${a.filename} (${a.contentType}, ${a.size}b)`).join(", ")}`
  );

  const result = await classifyEmail(parsed);
  console.log(
    `[Pipeline] Classification: ${result.classification} (confidence=${result.confidence}) reason="${result.reasoning}"`
  );

  await routeEmail(parsed, result, job.s3Key);

  console.log(`[Pipeline] Done for messageId=${job.messageId}`);
}

async function main(): Promise<void> {
  console.log("Email Processing Service starting...");
  console.log(`IMAP: ${config.imap.user}@${config.imap.host}`);
  console.log(`S3 Bucket: ${config.aws.s3Bucket}`);
  console.log(`SQS Queue: ${config.aws.sqsQueueUrl}`);
  console.log(`DynamoDB Table: ${config.aws.dynamoTableName}`);
  console.log(`Admin Email: ${config.ses.adminEmail}`);
  console.log(`LLM Model: ${config.openRouter.model}`);
  console.log("---");

  const shutdown = (): void => {
    console.log("\nShutting down...");
    stopImapPoller();
    stopWorker();
    setTimeout(() => process.exit(0), 1000);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Run IMAP poller and SQS worker concurrently
  await Promise.all([
    startImapPoller(),
    startWorker(processEmail),
  ]);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
