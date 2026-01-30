import { describe, expect, it } from "vitest";

import { resolveFinalAssistantText } from "./tui.js";

describe("resolveFinalAssistantText", () => {
  it("falls back to streamed text when final text is empty", () => {
    expect(resolveFinalAssistantText({ finalText: "", streamedText: "Hello" })).toBe("Hello");
  });

  it("prefers the final text when present", () => {
    expect(
      resolveFinalAssistantText({
        finalText: "All done",
        streamedText: "partial",
      }),
    ).toBe("All done");
  });

  it("shows (tool calls only) when both texts empty and message has tool calls", () => {
    expect(
      resolveFinalAssistantText({
        finalText: "",
        streamedText: "",
        message: { content: [{ type: "toolCall", id: "tc-1", name: "browser" }] },
      }),
    ).toBe("(tool calls only)");
  });

  it("shows (no output) when both texts empty and no message", () => {
    expect(resolveFinalAssistantText({ finalText: "", streamedText: "" })).toBe("(no output)");
  });
});
