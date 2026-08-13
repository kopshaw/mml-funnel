import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/require-user";

export async function GET() {
  const { error: authError } = await requireUser();
  if (authError) return authError;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const { error: authError } = await requireUser();
  if (authError) return authError;

  const body = await request.json();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("clients")
    .insert({
      name: body.name,
      slug: body.slug || body.name.toLowerCase().replace(/\s+/g, "-"),
      industry: body.industry,
      website: body.website,
      contact_email: body.contact_email,
      contact_phone: body.contact_phone,
      notes: body.notes,
      logo_url: body.logo_url,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
