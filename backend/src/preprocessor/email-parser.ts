import { simpleParser } from "mailparser";
import { convert } from "html-to-text";
import type { ParsedEmail, Attachment } from "../types";

export async function parseEmail(rawEmail: Buffer): Promise<ParsedEmail> {
  const parsed = await simpleParser(rawEmail);

  const from =
    parsed.from?.value?.[0]?.address ?? "unknown";
  const subject = parsed.subject ?? "(no subject)";

  let textContent = parsed.text ?? "";
  if (!textContent && parsed.html) {
    textContent = convert(parsed.html, {
      wordwrap: 120,
      selectors: [
        { selector: "a", options: { ignoreHref: true } },
        { selector: "img", format: "skip" },
      ],
    });
  }

  const attachments: Attachment[] = (parsed.attachments ?? []).map((att) => ({
    filename: att.filename ?? "unnamed",
    contentType: att.contentType ?? "application/octet-stream",
    size: att.size,
    content: att.content,
  }));

  return {
    messageId: parsed.messageId ?? `unknown-${Date.now()}`,
    from,
    subject,
    textContent,
    htmlContent: parsed.html || null,
    receivedAt: parsed.date ?? new Date(),
    attachments,
  };
}
