import { describe, it, expect } from "vitest";
import { extractErrorMessage } from "./error-message";

describe("extractErrorMessage", () => {
  it("returns the error field from a JSON error body", () => {
    const raw = JSON.stringify({ error: "Narrator is offline: KEY is not configured.", code: "X" });
    expect(extractErrorMessage(raw)).toBe("Narrator is offline: KEY is not configured.");
  });

  it("returns plain text unchanged", () => {
    expect(extractErrorMessage("Bad gateway")).toBe("Bad gateway");
  });

  it("returns the raw text when JSON has no error field", () => {
    expect(extractErrorMessage('{"message":"hi"}')).toBe('{"message":"hi"}');
  });

  it("returns the raw text when the error field is not a non-empty string", () => {
    expect(extractErrorMessage('{"error":42}')).toBe('{"error":42}');
    expect(extractErrorMessage('{"error":"  "}')).toBe('{"error":"  "}');
  });

  it("handles empty and JSON-null input", () => {
    expect(extractErrorMessage("")).toBe("");
    expect(extractErrorMessage("null")).toBe("null");
  });
});
