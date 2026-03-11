import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../aws-clients";
import { config } from "../config";
import { storeMetadata } from "./metadata-store";
import type { ParsedEmail, ClassificationResult, EmailMetadata } from "../types";

export async function handleSupplierFile(
  email: ParsedEmail,
  result: ClassificationResult,
  s3RawEmailKey: string
): Promise<void> {
  const details = result.supplierFileDetails;
  if (!details) {
    console.error("[Supplier] No supplier file details in classification result");
    return;
  }

  const attachment = email.attachments.find(
    (a) => a.filename === details.attachmentFilename
  );
  if (!attachment) {
    console.error(`[Supplier] Attachment "${details.attachmentFilename}" not found`);
    return;
  }

  // Upload supplier file to S3 under supplier-files/
  const date = new Date().toISOString().slice(0, 10);
  const senderDomain = email.from.split("@")[1] ?? "unknown";
  const s3Key = `supplier-files/${date}/${senderDomain}_${attachment.filename}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: s3Key,
      Body: attachment.content,
      ContentType: attachment.contentType,
    })
  );
  console.log(`[Supplier] Uploaded supplier file to S3: ${s3Key}`);

  // Store metadata in DynamoDB
  const metadata: EmailMetadata = {
    pk: `EMAIL#${email.messageId}`,
    sk: "CLASSIFICATION#supplier_file",
    from: email.from,
    subject: email.subject,
    classification: "supplier_file",
    confidence: result.confidence,
    reasoning: result.reasoning,
    receivedAt: email.receivedAt.toISOString(),
    processedAt: new Date().toISOString(),
    s3RawEmailKey,
    s3SupplierFileKey: s3Key,
    supplierFileDetails: details,
  };

  await storeMetadata(metadata);
  console.log(`[Supplier] Processing complete for "${attachment.filename}"`);
}
