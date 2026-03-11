import ExcelJS from "exceljs";
import OpenAI from "openai";
import { config } from "../config";
import type { Attachment, SupplierFileDetails } from "../types";

const REQUIRED_FIELDS = ["Brand", "Model Code", "Color", "Size", "RRP"];

const openai = new OpenAI({
  apiKey: config.openRouter.apiKey,
  baseURL: config.openRouter.baseUrl,
});

/**
 * Validates whether an xlsx attachment is a supplier file by checking
 * if any sheet contains columns that map to the 5 required fields.
 * Uses LLM for fuzzy column matching since supplier column names vary.
 */
export async function validateSupplierFile(
  attachment: Attachment
): Promise<SupplierFileDetails | null> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    attachment.content.buffer.slice(
      attachment.content.byteOffset,
      attachment.content.byteOffset + attachment.content.byteLength
    ) as ArrayBuffer
  );

  for (const worksheet of workbook.worksheets) {
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];

    headerRow.eachCell((cell, _colNumber) => {
      const value = cell.value?.toString().trim();
      if (value) {
        headers.push(value);
      }
    });

    if (headers.length < REQUIRED_FIELDS.length) {
      continue;
    }

    const mapping = await matchColumnsWithLLM(headers);
    if (!mapping) continue;

    const mappedFields = Object.values(mapping);
    const allRequired = REQUIRED_FIELDS.every((field) =>
      mappedFields.includes(field)
    );

    if (!allRequired) continue;

    let rowCount = 0;
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        const hasData = row.values && (row.values as unknown[]).some(
          (v) => v !== null && v !== undefined && v !== ""
        );
        if (hasData) rowCount++;
      }
    });

    console.log(
      `[Validator] Sheet "${worksheet.name}" matches supplier file structure: ${JSON.stringify(mapping)}`
    );

    return {
      attachmentFilename: attachment.filename,
      sheetName: worksheet.name,
      columnMapping: mapping,
      rowCount,
    };
  }

  return null;
}

async function matchColumnsWithLLM(
  headers: string[]
): Promise<Record<string, string> | null> {
  const prompt = `You are a data mapping assistant. Given these Excel column headers from a supplier product file, map each header to one of the required fields if applicable.

Required fields: ${REQUIRED_FIELDS.join(", ")}

Column headers found: ${headers.join(", ")}

Rules:
- Only map a header if you're confident it corresponds to a required field
- Column names vary between suppliers (e.g., "Article Style" = "Model Code", "Price Retail" = "RRP", "Article Color Text" = "Color")
- "RRP" means Recommended Retail Price - look for price-related columns
- "Model Code" is an article/style identifier, NOT a barcode/EAN/GTIN
- Return ONLY a JSON object mapping header names to required field names
- Only include headers that map to one of the 5 required fields
- If fewer than 5 required fields can be mapped, return {"match": false}

Respond with ONLY valid JSON, no explanation.`;

  try {
    const response = await openai.chat.completions.create({
      model: config.openRouter.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) return null;

    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    const result = JSON.parse(cleaned);

    if (result.match === false) return null;

    return result as Record<string, string>;
  } catch (err) {
    console.error("[Validator] LLM column matching failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
