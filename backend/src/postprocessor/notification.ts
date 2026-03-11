import { SendEmailCommand } from "@aws-sdk/client-ses";
import { ses } from "../aws-clients";
import { config } from "../config";

export async function sendAdminNotification(
  fromEmail: string,
  subject: string,
  bodyExcerpt: string,
  confidence: number,
  reasoning: string
): Promise<void> {
  const htmlBody = `
    <h2>New Deal Question Received</h2>
    <table style="border-collapse:collapse; font-family:sans-serif;">
      <tr><td style="padding:8px; font-weight:bold;">From:</td><td style="padding:8px;">${escapeHtml(fromEmail)}</td></tr>
      <tr><td style="padding:8px; font-weight:bold;">Subject:</td><td style="padding:8px;">${escapeHtml(subject)}</td></tr>
      <tr><td style="padding:8px; font-weight:bold;">Confidence:</td><td style="padding:8px;">${(confidence * 100).toFixed(0)}%</td></tr>
      <tr><td style="padding:8px; font-weight:bold;">Reasoning:</td><td style="padding:8px;">${escapeHtml(reasoning)}</td></tr>
    </table>
    <h3>Email Body Preview</h3>
    <blockquote style="border-left:3px solid #ccc; padding-left:12px; color:#555;">
      ${escapeHtml(bodyExcerpt)}
    </blockquote>
    <p style="color:#999; font-size:12px;">This notification was sent by the Email Processing Service.</p>
  `;

  await ses.send(
    new SendEmailCommand({
      Source: config.ses.senderEmail,
      Destination: {
        ToAddresses: [config.ses.adminEmail],
      },
      Message: {
        Subject: {
          Data: `[Deal Question] ${subject}`,
        },
        Body: {
          Html: { Data: htmlBody },
          Text: {
            Data: `New deal question from ${fromEmail}\nSubject: ${subject}\nConfidence: ${(confidence * 100).toFixed(0)}%\n\n${bodyExcerpt}`,
          },
        },
      },
    })
  );
  console.log(`[SES] Admin notification sent to ${config.ses.adminEmail}`);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br>");
}
