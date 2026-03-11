import {
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";
import { sqs } from "../aws-clients";
import { config } from "../config";
import type { SqsJobMessage } from "../types";

export async function enqueueJob(job: SqsJobMessage): Promise<void> {
  await sqs.send(
    new SendMessageCommand({
      QueueUrl: config.aws.sqsQueueUrl,
      MessageBody: JSON.stringify(job),
      MessageGroupId: undefined,
    })
  );
  console.log(`[SQS] Enqueued job for messageId=${job.messageId}`);
}

export async function receiveJobs(): Promise<
  Array<{ job: SqsJobMessage; receiptHandle: string }>
> {
  const response = await sqs.send(
    new ReceiveMessageCommand({
      QueueUrl: config.aws.sqsQueueUrl,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 20,
    })
  );

  if (!response.Messages || response.Messages.length === 0) {
    return [];
  }

  return response.Messages.filter((msg) => msg.Body && msg.ReceiptHandle).map(
    (msg) => ({
      job: JSON.parse(msg.Body!) as SqsJobMessage,
      receiptHandle: msg.ReceiptHandle!,
    })
  );
}

export async function deleteJob(receiptHandle: string): Promise<void> {
  await sqs.send(
    new DeleteMessageCommand({
      QueueUrl: config.aws.sqsQueueUrl,
      ReceiptHandle: receiptHandle,
    })
  );
}
