import OpenAI from "openai";
import { config } from "../config";
import type { ClassificationResult } from "../types";

const openai = new OpenAI({
  apiKey: config.openRouter.apiKey,
  baseURL: config.openRouter.baseUrl,
});

const SYSTEM_PROMPT = `You are an email classifier for a product data platform. Classify incoming emails into one of these categories:

1. "deal_question" - Customer service questions, deal inquiries, pricing questions, order status requests, product availability questions, complaints, or any question related to business deals/orders.
   Examples: "What's the status of my order?", "Can you offer a better price?", "Is this product available in size L?", "I have a question about deal #1234"

2. "other" - Newsletters, spam, marketing emails, automated notifications, or anything unrelated to deals/customer service.
   Examples: promotional emails, system notifications, unrelated correspondence

Respond with ONLY valid JSON in this exact format:
{"classification": "deal_question" or "other", "confidence": 0.0-1.0, "reasoning": "brief explanation"}`;

export async function classifyWithLLM(
  subject: string,
  body: string
): Promise<ClassificationResult> {
  const truncatedBody = body.slice(0, 2000);
  const userMessage = `Subject: ${subject}\n\nBody:\n${truncatedBody}`;

  try {
    const response = await openai.chat.completions.create({
      model: config.openRouter.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0,
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      console.error("[LLM] Empty response from OpenRouter");
      return fallbackResult("Empty LLM response");
    }

    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    const result = JSON.parse(cleaned);

    const classification = result.classification === "deal_question" ? "deal_question" : "other";
    const confidence = typeof result.confidence === "number" ? result.confidence : 0.5;
    const reasoning = typeof result.reasoning === "string" ? result.reasoning : "No reasoning provided";

    console.log(`[LLM] Classification: ${classification} (confidence=${confidence})`);

    return { classification, confidence, reasoning };
  } catch (err) {
    console.error("[LLM] Classification failed:", err instanceof Error ? err.message : err);
    return fallbackResult("LLM call failed");
  }
}

function fallbackResult(reason: string): ClassificationResult {
  return {
    classification: "other",
    confidence: 0,
    reasoning: `Fallback: ${reason}`,
  };
}
