import type { ParsedEmail } from "../types";

const XLSX_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

export function hasXlsxAttachment(email: ParsedEmail): boolean {
  return email.attachments.some(
    (att) =>
      att.filename.toLowerCase().endsWith(".xlsx") ||
      att.filename.toLowerCase().endsWith(".xls") ||
      XLSX_MIME_TYPES.includes(att.contentType)
  );
}

export function getXlsxAttachments(email: ParsedEmail) {
  return email.attachments.filter(
    (att) =>
      att.filename.toLowerCase().endsWith(".xlsx") ||
      att.filename.toLowerCase().endsWith(".xls") ||
      XLSX_MIME_TYPES.includes(att.contentType)
  );
}
