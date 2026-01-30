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
  };
}
