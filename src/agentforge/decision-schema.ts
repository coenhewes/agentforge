import JSON5 from "json5";
import { z } from "zod";

export const BoardDecisionBusinessTypeSchema = z.enum([
  "saas",
  "infoProduct",
  "ecom",
  "newsletter",
  "agency",
  "other",
]);

export const BoardDecisionSystemSchema = z.enum([
  "payments",
  "auth",
  "fulfillment",
  "marketing",
  "analytics",
  "support",
]);

export const BoardDecisionSchema = z.object({
  version: z.literal(1),
  ventureName: z.string().min(1),
  businessType: BoardDecisionBusinessTypeSchema,
  oneLiner: z.string().min(1),
  requiredSystems: z.array(BoardDecisionSystemSchema).default([]),
  budgetUsd: z.number().nonnegative(),
  timelineDays: z.number().int().nonnegative(),
  successMetrics: z.array(
    z.object({
      name: z.string().min(1),
      target: z.string().min(1),
      windowDays: z.number().int().positive(),
    }),
  ),
  killSwitches: z.array(
    z.object({
      condition: z.string().min(1),
      action: z.string().min(1),
      windowDays: z.number().int().positive(),
    }),
  ),
  provisioningNeeds: z.array(
    z.object({
      service: z.string().min(1),
      purpose: z.string().min(1),
      agentAttempt: z.boolean(),
      humanOnly: z.boolean(),
      likelyBlocks: z.array(z.string()).default([]),
    }),
  ),
  executionPlan: z.array(
    z.object({
      owner: z.string().min(1),
      task: z.string().min(1),
      deliverable: z.string().min(1),
      dueDays: z.number().int().nonnegative(),
    }),
  ),
  notes: z.record(z.string(), z.unknown()).optional(),
});

export type BoardDecision = z.infer<typeof BoardDecisionSchema>;

export function extractDecisionJson5Block(text: string): string | null {
  // First, look for the explicit marker.
  const markerIdx = text.indexOf("DECISION_JSON5:");
  if (markerIdx === -1) return null;
  const after = text.slice(markerIdx);

  // Prefer a fenced code block.
  const fenceMatch = after.match(/```(?:json5|json)\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    const content = fenceMatch[1].trim();
    return content.length > 0 ? content : null;
  }

  // Fallback: try to parse from the first '{' after the marker.
  const braceIdx = after.indexOf("{");
  if (braceIdx === -1) return null;
  const candidate = after.slice(braceIdx).trim();
  return candidate.length > 0 ? candidate : null;
}

export function parseBoardDecisionFromCoordinatorText(text: string): BoardDecision {
  const block = extractDecisionJson5Block(text);
  if (!block) {
    throw new Error(
      'Missing machine-readable decision block. Coordinator output must include "DECISION_JSON5:" followed by a ```json5 fenced block.',
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON5.parse(block);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse DECISION_JSON5 block as JSON5: ${message}`);
  }
  const res = BoardDecisionSchema.safeParse(parsed);
  if (!res.success) {
    throw new Error(
      `DECISION_JSON5 schema validation failed:\n${res.error.issues
        .map((i) => `- ${i.path.join(".") || "<root>"}: ${i.message}`)
        .join("\n")}`,
    );
  }
  return res.data;
}
