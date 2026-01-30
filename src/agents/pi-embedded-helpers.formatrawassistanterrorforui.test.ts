import { describe, expect, it } from "vitest";

import { formatRawAssistantErrorForUi } from "./pi-embedded-helpers.js";

describe("formatRawAssistantErrorForUi", () => {
  it("renders HTTP code + type + message from Anthropic payloads", () => {
    const text = formatRawAssistantErrorForUi(
      '429 {"type":"error","error":{"type":"rate_limit_error","message":"Rate limited."},"request_id":"req_123"}',
    );

    expect(text).toContain("HTTP 429");
    expect(text).toContain("rate_limit_error");
    expect(text).toContain("Rate limited.");
    expect(text).toContain("req_123");
  });

  it("renders a generic unknown error message when raw is empty", () => {
    expect(formatRawAssistantErrorForUi("")).toContain("unknown error");
  });

  it("formats plain HTTP status lines", () => {
    expect(formatRawAssistantErrorForUi("500 Internal Server Error")).toBe(
      "HTTP 500: Internal Server Error",
    );
  });

  it("parses LLM error prefix and nested Gemini-style JSON (429 quota)", () => {
    const raw =
      'LLM error: { "error": { "code": 429, "message": "You exceeded your current quota, please check your plan and billing details.", "status": "RESOURCE_EXHAUSTED" } }';
    const text = formatRawAssistantErrorForUi(raw);
    expect(text).toContain("429");
    expect(text).toContain("You exceeded your current quota");
    expect(text).not.toContain("RESOURCE_EXHAUSTED");
    expect(text.length).toBeLessThan(200);
  });
});
