export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      funnels: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          slug: string;
          domain: string | null;
          status: "draft" | "active" | "paused" | "archived";
          health: "healthy" | "warning" | "critical";
          industry: string | null;
          target_audience: string | null;
          settings: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          slug: string;
          domain?: string | null;
          status?: "draft" | "active" | "paused" | "archived";
          health?: "healthy" | "warning" | "critical";
          industry?: string | null;
          target_audience?: string | null;
          settings?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          slug?: string;
          domain?: string | null;
          status?: "draft" | "active" | "paused" | "archived";
          health?: "healthy" | "warning" | "critical";
          industry?: string | null;
          target_audience?: string | null;
          settings?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      funnel_stages: {
        Row: {
          id: string;
          funnel_id: string;
          name: string;
          slug: string;
          stage_type:
            | "landing"
            | "optin"
            | "nurture"
            | "sales"
            | "checkout"
            | "upsell"
            | "thankyou";
          position: number;
          page_url: string | null;
          template_id: string | null;
          config: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          funnel_id: string;
          name: string;
          slug: string;
          stage_type:
            | "landing"
            | "optin"
            | "nurture"
            | "sales"
            | "checkout"
            | "upsell"
            | "thankyou";
          position: number;
          page_url?: string | null;
          template_id?: string | null;
          config?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          funnel_id?: string;
          name?: string;
          slug?: string;
          stage_type?:
            | "landing"
            | "optin"
            | "nurture"
            | "sales"
            | "checkout"
            | "upsell"
            | "thankyou";
          position?: number;
          page_url?: string | null;
          template_id?: string | null;
          config?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      stage_baselines: {
        Row: {
          id: string;
          stage_id: string;
          metric_name: string;
          baseline_value: number;
          lower_bound: number;
          upper_bound: number;
          sample_size: number;
          calculated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          stage_id: string;
          metric_name: string;
          baseline_value: number;
          lower_bound: number;
          upper_bound: number;
          sample_size: number;
          calculated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          stage_id?: string;
          metric_name?: string;
          baseline_value?: number;
          lower_bound?: number;
          upper_bound?: number;
          sample_size?: number;
          calculated_at?: string;
          created_at?: string;
        };
      };
      contacts: {
        Row: {
          id: string;
          funnel_id: string;
          email: string;
          phone: string | null;
          first_name: string | null;
          last_name: string | null;
          source: string | null;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          current_stage_id: string | null;
          risk_tier: "low" | "medium" | "high";
          lead_score: number;
          qualification_signals: Json | null;
          tags: string[] | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          funnel_id: string;
          email: string;
          phone?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          source?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          current_stage_id?: string | null;
          risk_tier?: "low" | "medium" | "high";
          lead_score?: number;
          qualification_signals?: Json | null;
          tags?: string[] | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          funnel_id?: string;
          email?: string;
          phone?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          source?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          current_stage_id?: string | null;
          risk_tier?: "low" | "medium" | "high";
          lead_score?: number;
          qualification_signals?: Json | null;
          tags?: string[] | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      pipeline_events: {
        Row: {
          id: string;
          contact_id: string;
          funnel_id: string;
          stage_id: string | null;
          event_type: string;
          event_data: Json | null;
          revenue_amount: number | null;
          occurred_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          contact_id: string;
          funnel_id: string;
          stage_id?: string | null;
          event_type: string;
          event_data?: Json | null;
          revenue_amount?: number | null;
          occurred_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          contact_id?: string;
          funnel_id?: string;
          stage_id?: string | null;
          event_type?: string;
          event_data?: Json | null;
          revenue_amount?: number | null;
          occurred_at?: string;
          created_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          contact_id: string;
          funnel_id: string;
          channel: "email" | "sms" | "chat" | "voice";
          status: "active" | "paused" | "completed" | "escalated";
          messages: Json;
          summary: string | null;
          sentiment_score: number | null;
          objections_detected: string[] | null;
          started_at: string;
          last_message_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          contact_id: string;
          funnel_id: string;
          channel: "email" | "sms" | "chat" | "voice";
          status?: "active" | "paused" | "completed" | "escalated";
          messages?: Json;
          summary?: string | null;
          sentiment_score?: number | null;
          objections_detected?: string[] | null;
          started_at?: string;
          last_message_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          contact_id?: string;
          funnel_id?: string;
          channel?: "email" | "sms" | "chat" | "voice";
          status?: "active" | "paused" | "completed" | "escalated";
          messages?: Json;
          summary?: string | null;
          sentiment_score?: number | null;
          objections_detected?: string[] | null;
          started_at?: string;
          last_message_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      metric_snapshots: {
        Row: {
          id: string;
          funnel_id: string;
          stage_id: string | null;
          period_start: string;
          period_end: string;
          visitors: number;
          conversions: number;
          conversion_rate: number;
          revenue: number;
          avg_time_on_page: number | null;
          bounce_rate: number | null;
          exit_rate: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          funnel_id: string;
          stage_id?: string | null;
          period_start: string;
          period_end: string;
          visitors?: number;
          conversions?: number;
          conversion_rate?: number;
          revenue?: number;
          avg_time_on_page?: number | null;
          bounce_rate?: number | null;
          exit_rate?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          funnel_id?: string;
          stage_id?: string | null;
          period_start?: string;
          period_end?: string;
          visitors?: number;
          conversions?: number;
          conversion_rate?: number;
          revenue?: number;
          avg_time_on_page?: number | null;
          bounce_rate?: number | null;
          exit_rate?: number | null;
          created_at?: string;
        };
      };
      email_metrics: {
        Row: {
          id: string;
          funnel_id: string;
          stage_id: string | null;
          campaign_name: string | null;
          sent_count: number;
          delivered_count: number;
          open_count: number;
          click_count: number;
          bounce_count: number;
          unsubscribe_count: number;
          spam_count: number;
          open_rate: number;
          click_rate: number;
          period_start: string;
          period_end: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          funnel_id: string;
          stage_id?: string | null;
          campaign_name?: string | null;
          sent_count?: number;
          delivered_count?: number;
          open_count?: number;
          click_count?: number;
          bounce_count?: number;
          unsubscribe_count?: number;
          spam_count?: number;
          open_rate?: number;
          click_rate?: number;
          period_start: string;
          period_end: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          funnel_id?: string;
          stage_id?: string | null;
          campaign_name?: string | null;
          sent_count?: number;
          delivered_count?: number;
          open_count?: number;
          click_count?: number;
          bounce_count?: number;
          unsubscribe_count?: number;
          spam_count?: number;
          open_rate?: number;
          click_rate?: number;
          period_start?: string;
          period_end?: string;
          created_at?: string;
        };
      };
      ad_metrics: {
        Row: {
          id: string;
          funnel_id: string;
          stage_id: string | null;
          platform: "meta" | "google" | "tiktok" | "linkedin" | "other";
          campaign_id: string | null;
          campaign_name: string | null;
          ad_set_name: string | null;
          impressions: number;
          clicks: number;
          spend: number;
          conversions: number;
          ctr: number;
          cpc: number;
          cpa: number;
          roas: number;
          period_start: string;
          period_end: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          funnel_id: string;
          stage_id?: string | null;
          platform: "meta" | "google" | "tiktok" | "linkedin" | "other";
          campaign_id?: string | null;
          campaign_name?: string | null;
          ad_set_name?: string | null;
          impressions?: number;
          clicks?: number;
          spend?: number;
          conversions?: number;
          ctr?: number;
          cpc?: number;
          cpa?: number;
          roas?: number;
          period_start: string;
          period_end: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          funnel_id?: string;
          stage_id?: string | null;
          platform?: "meta" | "google" | "tiktok" | "linkedin" | "other";
          campaign_id?: string | null;
          campaign_name?: string | null;
          ad_set_name?: string | null;
          impressions?: number;
          clicks?: number;
          spend?: number;
          conversions?: number;
          ctr?: number;
          cpc?: number;
          cpa?: number;
          roas?: number;
          period_start?: string;
          period_end?: string;
          created_at?: string;
        };
      };
      page_analytics: {
        Row: {
          id: string;
          funnel_id: string;
          stage_id: string;
          page_url: string;
          visitors: number;
          unique_visitors: number;
          page_views: number;
          avg_time_on_page: number;
          bounce_rate: number;
          scroll_depth_avg: number | null;
          click_map_data: Json | null;
          heatmap_data: Json | null;
          period_start: string;
          period_end: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          funnel_id: string;
          stage_id: string;
          page_url: string;
          visitors?: number;
          unique_visitors?: number;
          page_views?: number;
          avg_time_on_page?: number;
          bounce_rate?: number;
          scroll_depth_avg?: number | null;
          click_map_data?: Json | null;
          heatmap_data?: Json | null;
          period_start: string;
          period_end: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          funnel_id?: string;
          stage_id?: string;
          page_url?: string;
          visitors?: number;
          unique_visitors?: number;
          page_views?: number;
          avg_time_on_page?: number;
          bounce_rate?: number;
          scroll_depth_avg?: number | null;
          click_map_data?: Json | null;
          heatmap_data?: Json | null;
          period_start?: string;
          period_end?: string;
          created_at?: string;
        };
      };
      ab_tests: {
        Row: {
          id: string;
          funnel_id: string;
          stage_id: string;
          name: string;
          hypothesis: string | null;
          metric_to_optimize: string;
          status: "draft" | "running" | "paused" | "completed" | "cancelled";
          winner_variant_id: string | null;
          confidence_level: number | null;
          started_at: string | null;
          ended_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          funnel_id: string;
          stage_id: string;
          name: string;
          hypothesis?: string | null;
          metric_to_optimize: string;
          status?: "draft" | "running" | "paused" | "completed" | "cancelled";
          winner_variant_id?: string | null;
          confidence_level?: number | null;
          started_at?: string | null;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          funnel_id?: string;
          stage_id?: string;
          name?: string;
          hypothesis?: string | null;
          metric_to_optimize?: string;
          status?: "draft" | "running" | "paused" | "completed" | "cancelled";
          winner_variant_id?: string | null;
          confidence_level?: number | null;
          started_at?: string | null;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      ab_test_variants: {
        Row: {
          id: string;
          test_id: string;
          name: string;
          description: string | null;
          is_control: boolean;
          traffic_percentage: number;
          visitors: number;
          conversions: number;
          conversion_rate: number;
          revenue: number;
          config: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          test_id: string;
          name: string;
          description?: string | null;
          is_control?: boolean;
          traffic_percentage?: number;
          visitors?: number;
          conversions?: number;
          conversion_rate?: number;
          revenue?: number;
          config?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          test_id?: string;
          name?: string;
          description?: string | null;
          is_control?: boolean;
          traffic_percentage?: number;
          visitors?: number;
          conversions?: number;
          conversion_rate?: number;
          revenue?: number;
          config?: Json | null;
          created_at?: string;
        };
      };
      optimization_actions: {
        Row: {
          id: string;
          funnel_id: string;
          stage_id: string | null;
          action_type:
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
          title: string;
          description: string;
          status:
            | "suggested"
            | "approved"
            | "in_progress"
            | "deployed"
            | "monitoring"
            | "completed"
            | "rejected"
            | "rolled_back";
          priority: "low" | "medium" | "high" | "critical";
          estimated_impact: number | null;
          actual_impact: number | null;
          ai_reasoning: string | null;
          config: Json | null;
          approved_by: string | null;
          deployed_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          funnel_id: string;
          stage_id?: string | null;
          action_type:
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
          title: string;
          description: string;
          status?: "suggested" | "approved" | "in_progress" | "deployed" | "monitoring" | "completed" | "rejected" | "rolled_back";
          priority?: "low" | "medium" | "high" | "critical";
          estimated_impact?: number | null;
          actual_impact?: number | null;
          ai_reasoning?: string | null;
          config?: Json | null;
          approved_by?: string | null;
          deployed_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          funnel_id?: string;
          stage_id?: string | null;
          action_type?:
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
          title?: string;
          description?: string;
          status?: "suggested" | "approved" | "in_progress" | "deployed" | "monitoring" | "completed" | "rejected" | "rolled_back";
          priority?: "low" | "medium" | "high" | "critical";
          estimated_impact?: number | null;
          actual_impact?: number | null;
          ai_reasoning?: string | null;
          config?: Json | null;
          approved_by?: string | null;
          deployed_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      objection_playbook: {
        Row: {
          id: string;
          funnel_id: string;
          objection_category: string;
          objection_pattern: string;
          response_template: string;
          tone: "empathetic" | "authoritative" | "casual" | "urgent";
          effectiveness_score: number | null;
          times_used: number;
          last_used_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          funnel_id: string;
          objection_category: string;
          objection_pattern: string;
          response_template: string;
          tone?: "empathetic" | "authoritative" | "casual" | "urgent";
          effectiveness_score?: number | null;
          times_used?: number;
          last_used_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          funnel_id?: string;
          objection_category?: string;
          objection_pattern?: string;
          response_template?: string;
          tone?: "empathetic" | "authoritative" | "casual" | "urgent";
          effectiveness_score?: number | null;
          times_used?: number;
          last_used_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      alerts: {
        Row: {
          id: string;
          funnel_id: string;
          stage_id: string | null;
          alert_type:
            | "conversion_drop"
            | "traffic_spike"
            | "traffic_drop"
            | "revenue_anomaly"
            | "bounce_rate_spike"
            | "email_deliverability"
            | "ad_performance"
            | "budget_threshold";
          severity: "info" | "warning" | "critical";
          title: string;
          message: string;
          metric_name: string | null;
          metric_value: number | null;
          threshold_value: number | null;
          is_read: boolean;
          is_resolved: boolean;
          resolved_at: string | null;
          resolved_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          funnel_id: string;
          stage_id?: string | null;
          alert_type:
            | "conversion_drop"
            | "traffic_spike"
            | "traffic_drop"
            | "revenue_anomaly"
            | "bounce_rate_spike"
            | "email_deliverability"
            | "ad_performance"
            | "budget_threshold";
          severity?: "info" | "warning" | "critical";
          title: string;
          message: string;
          metric_name?: string | null;
          metric_value?: number | null;
          threshold_value?: number | null;
          is_read?: boolean;
          is_resolved?: boolean;
          resolved_at?: string | null;
          resolved_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          funnel_id?: string;
          stage_id?: string | null;
          alert_type?:
            | "conversion_drop"
            | "traffic_spike"
            | "traffic_drop"
            | "revenue_anomaly"
            | "bounce_rate_spike"
            | "email_deliverability"
            | "ad_performance"
            | "budget_threshold";
          severity?: "info" | "warning" | "critical";
          title?: string;
          message?: string;
          metric_name?: string | null;
          metric_value?: number | null;
          threshold_value?: number | null;
          is_read?: boolean;
          is_resolved?: boolean;
          resolved_at?: string | null;
          resolved_by?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      funnel_status: "draft" | "active" | "paused" | "archived";
      funnel_health: "healthy" | "warning" | "critical";
      stage_type:
        | "landing"
        | "optin"
        | "nurture"
        | "sales"
        | "checkout"
        | "upsell"
        | "thankyou";
      risk_tier: "low" | "medium" | "high";
      conversation_channel: "email" | "sms" | "chat" | "voice";
      conversation_status: "active" | "paused" | "completed" | "escalated";
      ad_platform: "meta" | "google" | "tiktok" | "linkedin" | "other";
      ab_test_status:
        | "draft"
        | "running"
        | "paused"
        | "completed"
        | "cancelled";
      action_type:
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
      action_status:
        | "suggested"
        | "approved"
        | "in_progress"
        | "deployed"
        | "monitoring"
        | "completed"
        | "rejected"
        | "rolled_back";
      action_priority: "low" | "medium" | "high" | "critical";
      objection_tone: "empathetic" | "authoritative" | "casual" | "urgent";
      alert_type:
        | "conversion_drop"
        | "traffic_spike"
        | "traffic_drop"
        | "revenue_anomaly"
        | "bounce_rate_spike"
        | "email_deliverability"
        | "ad_performance"
        | "budget_threshold";
      alert_severity: "info" | "warning" | "critical";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// -------------------------------------------------------
// Convenience aliases matching Supabase codegen patterns
// -------------------------------------------------------

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];

export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];

export type Enums<T extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][T];
