// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DateRange {
  since: string; // YYYY-MM-DD
  until: string; // YYYY-MM-DD
}

export interface AdInsights {
  campaignId: string;
  campaignName: string;
  impressions: number;
  clicks: number;
  spend: number;
  cpc: number;
  cpm: number;
  ctr: number;
  conversions: number;
  costPerConversion: number;
  reach: number;
  frequency: number;
  dateStart: string;
  dateStop: string;
}

export interface AdSet {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED";
  dailyBudget: string;
  campaignId: string;
  targeting: Record<string, unknown>;
}

export interface Ad {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED";
  adSetId: string;
  creative: Record<string, unknown>;
}

export interface CreateAdData {
  name: string;
  creativeId: string;
  status?: "ACTIVE" | "PAUSED";
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_VERSION = "v21.0";
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

function getAccessToken(): string {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) {
    throw new Error("META_ACCESS_TOKEN environment variable is not set");
  }
  return token;
}

function getAdAccountId(): string {
  const id = process.env.META_AD_ACCOUNT_ID;
  if (!id) {
    throw new Error("META_AD_ACCOUNT_ID environment variable is not set");
  }
  // Ensure act_ prefix
  return id.startsWith("act_") ? id : `act_${id}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function metaFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();
  const separator = endpoint.includes("?") ? "&" : "?";
  const url = `${BASE_URL}${endpoint}${separator}access_token=${token}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Meta API error ${response.status}: ${
        error?.error?.message ?? response.statusText
      }`
    );
  }

  return response.json() as Promise<T>;
}

function formatInsights(raw: Record<string, unknown>): AdInsights {
  return {
    campaignId: String(raw.campaign_id ?? ""),
    campaignName: String(raw.campaign_name ?? ""),
    impressions: Number(raw.impressions ?? 0),
    clicks: Number(raw.clicks ?? 0),
    spend: Number(raw.spend ?? 0),
    cpc: Number(raw.cpc ?? 0),
    cpm: Number(raw.cpm ?? 0),
    ctr: Number(raw.ctr ?? 0),
    conversions: Number(
      (raw.actions as Array<{ action_type: string; value: string }> | undefined)
        ?.find((a) => a.action_type === "offsite_conversion")?.value ?? 0
    ),
    costPerConversion: Number(
      (
        raw.cost_per_action_type as
          | Array<{ action_type: string; value: string }>
          | undefined
      )?.find((a) => a.action_type === "offsite_conversion")?.value ?? 0
    ),
    reach: Number(raw.reach ?? 0),
    frequency: Number(raw.frequency ?? 0),
    dateStart: String(raw.date_start ?? ""),
    dateStop: String(raw.date_stop ?? ""),
  };
}

// ---------------------------------------------------------------------------
// Campaign insights
// ---------------------------------------------------------------------------

export async function getCampaignInsights(
  campaignId: string,
  dateRange: DateRange
): Promise<AdInsights[]> {
  const fields = [
    "campaign_id",
    "campaign_name",
    "impressions",
    "clicks",
    "spend",
    "cpc",
    "cpm",
    "ctr",
    "actions",
    "cost_per_action_type",
    "reach",
    "frequency",
  ].join(",");

  const result = await metaFetch<{ data: Record<string, unknown>[] }>(
    `/${campaignId}/insights?fields=${fields}&time_range={"since":"${dateRange.since}","until":"${dateRange.until}"}`
  );

  return result.data.map(formatInsights);
}

// ---------------------------------------------------------------------------
// AdSet insights
// ---------------------------------------------------------------------------

export async function getAdSetInsights(
  adSetId: string,
  dateRange: DateRange
): Promise<AdInsights[]> {
  const fields = [
    "campaign_id",
    "campaign_name",
    "impressions",
    "clicks",
    "spend",
    "cpc",
    "cpm",
    "ctr",
    "actions",
    "cost_per_action_type",
    "reach",
    "frequency",
  ].join(",");

  const result = await metaFetch<{ data: Record<string, unknown>[] }>(
    `/${adSetId}/insights?fields=${fields}&time_range={"since":"${dateRange.since}","until":"${dateRange.until}"}`
  );

  return result.data.map(formatInsights);
}

// ---------------------------------------------------------------------------
// Budget management
// ---------------------------------------------------------------------------

export async function updateAdSetBudget(
  adSetId: string,
  dailyBudgetCents: number
): Promise<{ success: boolean }> {
  await metaFetch<{ success: boolean }>(`/${adSetId}`, {
    method: "POST",
    body: JSON.stringify({ daily_budget: dailyBudgetCents }),
  });

  return { success: true };
}

// ---------------------------------------------------------------------------
// Ad status management
// ---------------------------------------------------------------------------

export async function pauseAd(adId: string): Promise<{ success: boolean }> {
  await metaFetch<{ success: boolean }>(`/${adId}`, {
    method: "POST",
    body: JSON.stringify({ status: "PAUSED" }),
  });

  return { success: true };
}

export async function resumeAd(adId: string): Promise<{ success: boolean }> {
  await metaFetch<{ success: boolean }>(`/${adId}`, {
    method: "POST",
    body: JSON.stringify({ status: "ACTIVE" }),
  });

  return { success: true };
}

// ---------------------------------------------------------------------------
// Create ad
// ---------------------------------------------------------------------------

export async function createAd(
  adSetId: string,
  adData: CreateAdData
): Promise<Ad> {
  const accountId = getAdAccountId();

  const result = await metaFetch<{ id: string }>(`/${accountId}/ads`, {
    method: "POST",
    body: JSON.stringify({
      name: adData.name,
      adset_id: adSetId,
      creative: { creative_id: adData.creativeId },
      status: adData.status ?? "PAUSED",
    }),
  });

  return {
    id: result.id,
    name: adData.name,
    status: adData.status ?? "PAUSED",
    adSetId,
    creative: { creative_id: adData.creativeId },
  };
}
