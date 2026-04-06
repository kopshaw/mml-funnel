export type {
  Database,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from "./database";

// ----- Domain helper types -----

export type FunnelHealth = "healthy" | "warning" | "critical";

export type RiskTier = "low" | "medium" | "high";

export type ActionStatus =
  | "suggested"
  | "approved"
  | "in_progress"
  | "deployed"
  | "monitoring"
  | "completed"
  | "rejected"
  | "rolled_back";

export type ConversationChannel = "email" | "sms" | "chat" | "voice";

export type AlertSeverity = "info" | "warning" | "critical";

// ----- Conversation message (stored as JSON in the messages column) -----

export interface ConversationMessage {
  role: "assistant" | "user" | "system";
  content: string;
  timestamp: string;
  metadata?: {
    sentiment?: number;
    intent?: string;
    objections?: string[];
    suggested_action?: string;
    [key: string]: unknown;
  };
}

// ----- Qualification signals (stored as JSON on contacts) -----

export interface QualificationSignals {
  pages_visited: number;
  emails_opened: number;
  emails_clicked: number;
  time_on_site_seconds: number;
  return_visits: number;
  pricing_page_views: number;
  demo_requested: boolean;
  content_downloaded: string[];
  webinar_attended: boolean;
  objections_raised: string[];
  budget_mentioned: boolean;
  timeline_mentioned: boolean;
  decision_maker_confirmed: boolean;
  competitor_mentioned: string[];
  last_activity_at: string;
  [key: string]: unknown;
}

// ----- Stage type for funnel_stages -----

export type StageType =
  | "landing"
  | "optin"
  | "nurture"
  | "sales"
  | "checkout"
  | "upsell"
  | "thankyou";

// ----- Ad platform -----

export type AdPlatform = "meta" | "google" | "tiktok" | "linkedin" | "other";

// ----- Optimization action type -----

export type ActionType =
  | "copy_change"
  | "design_change"
  | "offer_change"
  | "audience_change"
  | "email_sequence"
  | "ab_test"
  | "urgency_trigger"
  | "social_proof"
  | "price_adjustment"
  | "retargeting";

// ----- Alert type -----

export type AlertType =
  | "conversion_drop"
  | "traffic_spike"
  | "traffic_drop"
  | "revenue_anomaly"
  | "bounce_rate_spike"
  | "email_deliverability"
  | "ad_performance"
  | "budget_threshold";
