import { ImapFlow } from "imapflow";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { config } from "../config";
import { s3 } from "../aws-clients";
import { enqueueJob } from "../queue/sqs-client";
import type { SqsJobMessage } from "../types";

let running = false;

export async function startImapPoller(): Promise<void> {
  running = true;

  while (running) {
    try {
      await pollMailbox();
    } catch (err) {
      if (!running) break;
      console.error("[IMAP] Error during poll cycle, reconnecting in 10s:", err instanceof Error ? err.message : err);
      await sleep(10_000);
    }
  }
}

export function stopImapPoller(): void {
  running = false;
}

async function pollMailbox(): Promise<void> {
  const client = new ImapFlow({
    host: config.imap.host,
    port: config.imap.port,
    secure: true,
    auth: {
      user: config.imap.user,
      pass: config.imap.password,
    },
    logger: false,
    emitLogs: false,
    socketTimeout: 600_000, // 10 minutes for large attachments
  });

  client.on("error", (err: Error) => {
    console.error("[IMAP] Connection error:", err.message);
  });

  await client.connect();
  console.log("[IMAP] Connected to", config.imap.host);

  try {
    const lock = await client.getMailboxLock("INBOX");

    try {
      await processUnseenMessages(client);

      console.log("[IMAP] Waiting for new messages (IDLE)...");
      await client.idle();
      console.log("[IMAP] IDLE interrupted, checking for new messages...");

      await processUnseenMessages(client);
    } finally {
      lock.release();
    }
  } finally {
    try {
      await client.logout();
    } catch {
      // Connection may already be closed
    }
  }
}

async function processUnseenMessages(client: ImapFlow): Promise<void> {
  const searchResult = await client.search({ seen: false }, { uid: true });
  const uids = Array.isArray(searchResult) ? searchResult : [];
  if (uids.length === 0) {
    console.log("[IMAP] No unseen messages found.");
    return;
  }
  console.log(`[IMAP] Found ${uids.length} unseen message(s): UIDs=${uids.join(",")}`);

  for (const uid of uids) {
    try {
      console.log(`[IMAP] Fetching UID=${uid}...`);
      const msg = await client.fetchOne(uid.toString(), { source: true, envelope: true }, { uid: true });

      if (!msg || !msg.envelope) {
        console.log(`[IMAP] No data for UID=${uid}, skipping.`);
        continue;
      }

      const envelope = msg.envelope;
      const messageId = envelope.messageId ?? `unknown-${Date.now()}`;
      const from = envelope.from?.[0]?.address ?? "unknown";
      const subject = envelope.subject ?? "(no subject)";
      const receivedAt = envelope.date?.toISOString() ?? new Date().toISOString();

      console.log(`[IMAP] New email (UID=${uid}): from=${from} subject="${subject}" sourceSize=${msg.source?.length ?? 0}`);

      const rawEmail = msg.source;
      if (!rawEmail || rawEmail.length === 0) {
        console.log(`[IMAP] Empty source for UID=${uid}, skipping.`);
        continue;
      }

      const s3Key = `raw-emails/${sanitizeKey(messageId)}.eml`;

      await s3.send(
        new PutObjectCommand({
          Bucket: config.aws.s3Bucket,
          Key: s3Key,
          Body: rawEmail,
          ContentType: "message/rfc822",
        })
      );
      console.log(`[S3] Uploaded raw email: ${s3Key}`);

      const job: SqsJobMessage = {
        messageId,
        s3Key,
        from,
        subject,
        receivedAt,
      };
      await enqueueJob(job);

      await client.messageFlagsAdd(uid.toString(), ["\\Seen"], { uid: true });
      console.log(`[IMAP] Marked UID=${uid} as seen.`);
    } catch (err) {
      console.error(`[IMAP] Error processing UID=${uid}:`, err instanceof Error ? err.message : err);
    }
  }
}

function sanitizeKey(messageId: string): string {
  return messageId.replace(/[<>]/g, "").replace(/[^a-zA-Z0-9._@-]/g, "_");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
