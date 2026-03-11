import { handleSupplierFile } from "./supplier-handler";
import { handleDealQuestion } from "./deal-question-handler";
import { storeMetadata } from "./metadata-store";
import type { ParsedEmail, ClassificationResult, EmailMetadata } from "../types";

export async function routeEmail(
  email: ParsedEmail,
  result: ClassificationResult,
  s3RawEmailKey: string
): Promise<void> {
  switch (result.classification) {
    case "supplier_file":
      await handleSupplierFile(email, result, s3RawEmailKey);
      break;

    case "deal_question":
      await handleDealQuestion(email, result, s3RawEmailKey);
      break;

    case "other": {
      console.log(`[Router] Email classified as "other", storing metadata only.`);
      const metadata: EmailMetadata = {
        pk: `EMAIL#${email.messageId}`,
        sk: "CLASSIFICATION#other",
        from: email.from,
        subject: email.subject,
        classification: "other",
        confidence: result.confidence,
        reasoning: result.reasoning,
        receivedAt: email.receivedAt.toISOString(),
        processedAt: new Date().toISOString(),
        s3RawEmailKey,
        bodyExcerpt: email.textContent.slice(0, 500),
      };
      await storeMetadata(metadata);
      break;
    }
  }
}
