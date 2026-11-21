/**
 * useCompletion sets `error.message` to the raw response body, which for our
 * API errors is JSON like {"error":"...","code":"..."}. Return the readable
 * `error` field when present, otherwise the original text.
 */
export function extractErrorMessage(raw: string): string {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "error" in parsed) {
      const value = (parsed as { error: unknown }).error;
      if (typeof value === "string" && value.trim() !== "") return value;
    }
  } catch {
    // not JSON — fall through
  }
  return raw;
}
