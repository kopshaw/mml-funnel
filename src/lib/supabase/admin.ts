import { createClient as createSupabaseClient } from "@supabase/supabase-js";
/**
 * Admin client using the service role key. Bypasses RLS.
 * Only use in server-side contexts: API routes, edge functions, cron jobs.
 * Never expose to the browser.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
    );
  }

  // TODO: Re-add <Database> generic after running `npm run db:types` against real Supabase project
  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
