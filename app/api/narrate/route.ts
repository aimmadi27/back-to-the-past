import { NextRequest } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { buildNarratorPrompt } from "@/lib/narrator/build-prompt";
import { narrateBodySchema } from "@/lib/narrator/schema";
import { rateLimiter } from "@/lib/narrator/rate-limit";

/**
 * POST /api/narrate
 * Body: { diff: FeatureDiff, domain: string }
 *
 * Streams a spooky narrator response from Claude based on the structured diff.
 * One LLM call per request — no agents, no chains.
 */
export async function POST(request: NextRequest) {
  // Check API key up front — fail fast with a clear message
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Narrator is offline: ANTHROPIC_API_KEY is not configured." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  // Per-IP rate limiting (10 req/min, in-memory)
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimiter.check(ip)) {
    return new Response(
      JSON.stringify({ error: "Too many narrator requests. Please wait a moment." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = narrateBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Invalid request body", details: parsed.error.flatten() }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { diff, domain } = parsed.data;
  const modelId = process.env.NARRATOR_MODEL ?? "claude-haiku-5-5";
  const prompt = buildNarratorPrompt(diff, domain);

  const result = streamText({
    model: anthropic(modelId),
    prompt,
    maxTokens: 400,
    temperature: 0.8,
  });

  return result.toDataStreamResponse();
}
