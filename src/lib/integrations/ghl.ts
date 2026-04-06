// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GHLContactData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  source?: string;
  customFields?: Array<{ id: string; value: string }>;
}

export interface GHLContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tags: string[];
  dateAdded: string;
}

export interface GHLContactsResponse {
  contacts: GHLContact[];
  meta: {
    total: number;
    currentPage: number;
    nextPage: number | null;
  };
}

export interface GHLOpportunity {
  id: string;
  name: string;
  stageId: string;
  status: string;
  monetaryValue: number;
}

export interface GetContactsParams {
  query?: string;
  limit?: number;
  offset?: number;
  /** Filter by tag */
  tag?: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE_URL = "https://services.leadconnectorhq.com";

function getApiKey(): string {
  const key = process.env.GHL_API_KEY;
  if (!key) {
    throw new Error("GHL_API_KEY environment variable is not set");
  }
  return key;
}

function getLocationId(): string {
  const id = process.env.GHL_LOCATION_ID;
  if (!id) {
    throw new Error("GHL_LOCATION_ID environment variable is not set");
  }
  return id;
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

async function ghlFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getApiKey();

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Version: "2021-07-28",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `GHL API error ${response.status}: ${
        error?.message ?? response.statusText
      }`
    );
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Create contact
// ---------------------------------------------------------------------------

export async function createContact(data: GHLContactData): Promise<GHLContact> {
  const locationId = getLocationId();

  const result = await ghlFetch<{ contact: GHLContact }>("/contacts/", {
    method: "POST",
    body: JSON.stringify({
      locationId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      tags: data.tags,
      source: data.source ?? "MML Funnel",
      customFields: data.customFields,
    }),
  });

  return result.contact;
}

// ---------------------------------------------------------------------------
// Update contact
// ---------------------------------------------------------------------------

export async function updateContact(
  ghlContactId: string,
  data: Partial<GHLContactData>
): Promise<GHLContact> {
  const result = await ghlFetch<{ contact: GHLContact }>(
    `/contacts/${ghlContactId}`,
    {
      method: "PUT",
      body: JSON.stringify({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        tags: data.tags,
        source: data.source,
        customFields: data.customFields,
      }),
    }
  );

  return result.contact;
}

// ---------------------------------------------------------------------------
// Move opportunity to a pipeline stage
// ---------------------------------------------------------------------------

export async function moveOpportunity(
  opportunityId: string,
  stageId: string
): Promise<GHLOpportunity> {
  const result = await ghlFetch<{ opportunity: GHLOpportunity }>(
    `/opportunities/${opportunityId}`,
    {
      method: "PUT",
      body: JSON.stringify({ stageId }),
    }
  );

  return result.opportunity;
}

// ---------------------------------------------------------------------------
// Get contacts (with optional filters)
// ---------------------------------------------------------------------------

export async function getContacts(
  params: GetContactsParams = {}
): Promise<GHLContactsResponse> {
  const locationId = getLocationId();

  const searchParams = new URLSearchParams({ locationId });

  if (params.query) searchParams.set("query", params.query);
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.offset) searchParams.set("offset", String(params.offset));

  const result = await ghlFetch<GHLContactsResponse>(
    `/contacts/?${searchParams.toString()}`
  );

  // If tag filter requested, apply client-side (GHL search API is limited)
  if (params.tag) {
    return {
      ...result,
      contacts: result.contacts.filter((c) => c.tags.includes(params.tag!)),
    };
  }

  return result;
}
