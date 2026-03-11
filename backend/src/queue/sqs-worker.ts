import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../aws-clients";
import { config } from "../config";
import { receiveJobs, deleteJob } from "./sqs-client";
import type { SqsJobMessage } from "../types";

type ProcessFn = (job: SqsJobMessage, rawEmail: Buffer) => Promise<void>;

let running = false;

export async function startWorker(processFn: ProcessFn): Promise<void> {
  running = true;
  console.log("[Worker] Started, polling SQS for jobs...");

  while (running) {
    try {
      const messages = await receiveJobs();

      if (messages.length === 0) {
        continue;
      }

      for (const { job, receiptHandle } of messages) {
        try {
          console.log(
            `[Worker] Processing job: messageId=${job.messageId} from=${job.from} subject="${job.subject}"`
          );

          const rawEmail = await downloadFromS3(job.s3Key);
          await processFn(job, rawEmail);

          await deleteJob(receiptHandle);
          console.log(`[Worker] Job completed and deleted: messageId=${job.messageId}`);
        } catch (err) {
          console.error(
            `[Worker] Failed to process job messageId=${job.messageId}:`,
            err
          );
          // Message will become visible again after visibility timeout for retry
        }
      }
    } catch (err) {
      console.error("[Worker] Error polling SQS, retrying in 5s:", err);
      await sleep(5_000);
    }
  }
}

export function stopWorker(): void {
  running = false;
}

async function downloadFromS3(key: string): Promise<Buffer> {
  const response = await s3.send(
    new GetObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: key,
    })
  );

  const stream = response.Body;
  if (!stream) {
    throw new Error(`Empty response from S3 for key: ${key}`);
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
