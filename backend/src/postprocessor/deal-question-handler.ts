import { sendAdminNotification } from "./notification";
import { storeMetadata } from "./metadata-store";
import type { ParsedEmail, ClassificationResult, EmailMetadata } from "../types";

export async function handleDealQuestion(
  email: ParsedEmail,
  result: ClassificationResult,
  s3RawEmailKey: string
): Promise<void> {
  const bodyExcerpt = email.textContent.slice(0, 500);

  // Send admin notification via SES
  await sendAdminNotification(
    email.from,
    email.subject,
    bodyExcerpt,
    result.confidence,
    result.reasoning
  );

  // Store metadata in DynamoDB
  const metadata: EmailMetadata = {
    pk: `EMAIL#${email.messageId}`,
    sk: "CLASSIFICATION#deal_question",
    from: email.from,
    subject: email.subject,
    classification: "deal_question",
    confidence: result.confidence,
    reasoning: result.reasoning,
    receivedAt: email.receivedAt.toISOString(),
    processedAt: new Date().toISOString(),
    s3RawEmailKey,
    bodyExcerpt,
  };

  await storeMetadata(metadata);
  console.log(`[DealQuestion] Processing complete for "${email.subject}"`);
}
