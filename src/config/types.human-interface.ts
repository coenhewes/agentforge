export interface HumanInterfaceConfig {
  enabled?: boolean;
  channels?: {
    notifications?: string;
    urgent?: string;
    approvals?: string;
  };
  autoApprove?: {
    enabled?: boolean;
    categories?: string[];
    maxAmount?: number;
  };
  escalation?: {
    urgentTimeout?: string;
    highTimeout?: string;
    mediumTimeout?: string;
    lowTimeout?: string;
  };
  agentforge?: {
    capitalManagement?: {
      enabled?: boolean;
      allowedSpendUsd?: number;
      cardEncryptionKeyId?: string;
    };
    stripe?: {
      enabled?: boolean;
      secretKey?: string;
      publicKey?: string;
    };
    heartbeat?: {
      enabled?: boolean;
      intervalMinutes?: number;
    };
    ventureRunloop?: {
      enabled?: boolean;
      subagentTimeoutMinutes?: number;
    };
    /** Max ventures the CEO may work on in parallel; unset = no hard limit (CEO uses judgment). */
    ventures?: {
      maxActive?: number;
    };
  };
}
