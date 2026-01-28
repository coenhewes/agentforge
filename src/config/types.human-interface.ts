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
}
