export interface ParsedEmail {
  messageId: string;
  from: string;
  subject: string;
  textContent: string;
  htmlContent: string | null;
  receivedAt: Date;
  attachments: Attachment[];
}

export interface Attachment {
  filename: string;
  contentType: string;
  size: number;
  content: Buffer;
}

export type EmailClassification = "supplier_file" | "deal_question" | "other";

export interface ClassificationResult {
  classification: EmailClassification;
  confidence: number;
  reasoning: string;
  supplierFileDetails?: SupplierFileDetails;
}

export interface SupplierFileDetails {
  attachmentFilename: string;
  sheetName: string;
  columnMapping: Record<string, string>;
  rowCount: number;
}

export interface SqsJobMessage {
  messageId: string;
  s3Key: string;
  from: string;
  subject: string;
  receivedAt: string;
}

export interface EmailMetadata {
  pk: string;
  sk: string;
  from: string;
  subject: string;
  classification: EmailClassification;
  confidence: number;
  reasoning: string;
  receivedAt: string;
  processedAt: string;
  s3RawEmailKey: string;
  s3SupplierFileKey?: string;
  supplierFileDetails?: SupplierFileDetails;
  bodyExcerpt?: string;
}
