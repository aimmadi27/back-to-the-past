import { NextRequest } from "next/server";
import { streamText } from "ai";
import { buildNarratorPrompt } from "@/lib/narrator/build-prompt";
import { narrateBodySchema } from "@/lib/narrator/schema";
import { rateLimiter } from "@/lib/narrator/rate-limit";
import { getNarratorModel, NARRATOR_MAX_TOKENS } from "@/lib/narrator/model";
import {
  errorToJson,
  errorToStatus,
  NarratorNotConfiguredError,
  UnknownNarratorProviderError,
} from "@/lib/errors";

/**
 * POST /api/narrate
 * Body: { diff: FeatureDiff, domain: string }
 *
 * Streams a spooky narrator response from the configured LLM (see
 * lib/narrator/model.ts) based on the structured diff.
 * One LLM call per request — no agents, no chains.
 */
export async function POST(request: NextRequest) {
  // Resolve the model up front — fail fast with a clear message
  let narrator;
  try {
    narrator = getNarratorModel(process.env);
  } catch (err) {
    if (err instanceof NarratorNotConfiguredError || err instanceof UnknownNarratorProviderError) {
      return new Response(JSON.stringify(errorToJson(err)), {
        status: errorToStatus(err),
        headers: { "Content-Type": "application/json" },
      });
    }
    throw err;
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
  const prompt = buildNarratorPrompt(diff, domain);

  const result = streamText({
    model: narrator.model,
    prompt,
    maxTokens: NARRATOR_MAX_TOKENS,
    temperature: 0.8,
  });

  return result.toDataStreamResponse();
}
