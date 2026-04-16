"use client";

import { useEffect } from "react";

/**
 * Persists the assigned A/B variant into a client-side cookie so that
 * subsequent visits serve the same variant. The server assigns randomly
 * on first visit, then reads the cookie on all future visits.
 *
 * We can't write cookies from Server Components in Next.js 15 (read-only),
 * so this client component handles persistence after hydration.
 */
export function VariantPersister({
  testId,
  variantId,
}: {
  testId: string;
  variantId: string;
}) {
  useEffect(() => {
    const cookieName = `sophia_ab_${testId}`;
    const existing = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${cookieName}=`));

    if (existing?.split("=")[1] === variantId) return; // Already set

    // 30 days
    const maxAge = 60 * 60 * 24 * 30;
    document.cookie = `${cookieName}=${variantId}; Path=/; Max-Age=${maxAge}; SameSite=Lax${
      window.location.protocol === "https:" ? "; Secure" : ""
    }`;
  }, [testId, variantId]);

  return null;
}
