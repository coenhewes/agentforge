/**
 * Budget configuration for controlling agent spending limits.
 * Costs are tracked via session transcripts and checked before each agent run.
 */
export type BudgetConfig = {
  /** Daily spending limit in USD (0 = unlimited). Default: 0. */
  daily?: number;
  /** Monthly spending limit in USD (0 = unlimited). Default: 0. */
  monthly?: number;
  /** Alert threshold as a fraction of the limit (0.0-1.0, e.g., 0.8 = 80%). Default: 0.8. */
  alertAt?: number;
  /** Action when limit is reached: "warn" logs warning but allows run, "block" rejects run. Default: "warn". */
  action?: "warn" | "block";
};
