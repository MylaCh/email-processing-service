import { hasXlsxAttachment, getXlsxAttachments } from "./rules-engine";
import { validateSupplierFile } from "./supplier-validator";
import { classifyWithLLM } from "./llm-classifier";
import type { ParsedEmail, ClassificationResult } from "../types";

/**
 * Two-stage classification:
 * 1. Rules: check for .xlsx attachments -> validate supplier file structure
 * 2. LLM: classify text content (deal question vs other)
 */
export async function classifyEmail(
  email: ParsedEmail
): Promise<ClassificationResult> {
  // Stage 1: Check for xlsx attachments
  if (hasXlsxAttachment(email)) {
    console.log("[Classifier] Found .xlsx attachment(s), validating supplier file...");
    const xlsxAttachments = getXlsxAttachments(email);

    for (const attachment of xlsxAttachments) {
      const details = await validateSupplierFile(attachment);
      if (details) {
        return {
          classification: "supplier_file",
          confidence: 0.95,
          reasoning: `Excel file "${attachment.filename}" sheet "${details.sheetName}" matches supplier file structure with ${details.rowCount} data rows`,
          supplierFileDetails: details,
        };
      }
    }

    console.log("[Classifier] .xlsx found but no sheet matches supplier file structure, falling through to LLM...");
  }

  // Stage 2: LLM classification for deal questions
  console.log("[Classifier] Classifying via LLM...");
  return classifyWithLLM(email.subject, email.textContent);
}
