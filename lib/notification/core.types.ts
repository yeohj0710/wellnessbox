export type PushRole = "customer" | "pharm" | "rider";

export type PushTarget = {
  orderId?: number;
  pharmacyId?: number;
  riderId?: number;
};

export type SubscriptionRecord = {
  endpoint: string;
  auth: string;
  p256dh: string;
};

export type PushFailureType =
  | "dead_endpoint"
  | "auth_error"
  | "timeout"
  | "network"
  | "unknown"
  | "internal";

export type PushSendOutcome =
  | { kind: "sent"; endpoint: string }
  | {
      kind: "failed";
      endpoint: string;
      failureType: PushFailureType;
      statusCode: number | null;
      isDeadEndpoint: boolean;
      errorMeta?: Record<string, unknown>;
    };
