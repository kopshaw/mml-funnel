"use client";

import { useEffect } from "react";

interface Props {
  funnelId: string;
  pageSlug: string;
  variantId?: string;
}

/**
 * Client-side analytics tracker for landing pages.
 * Records page views, scroll depth, and time on page.
 */
export function AnalyticsTracker({ funnelId, pageSlug, variantId }: Props) {
  useEffect(() => {
    const startTime = Date.now();
    let maxScrollDepth = 0;

    // Track page view
    fetch("/api/webhooks/meta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "page_view",
        funnelId,
        pageSlug,
        variantId,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
      }),
    }).catch(() => {});

    // Track scroll depth
    function handleScroll() {
      const scrolled = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const depth = height > 0 ? Math.round((scrolled / height) * 100) : 0;
      maxScrollDepth = Math.max(maxScrollDepth, depth);
    }

    // Track time on page + scroll depth on unload
    function handleUnload() {
      const timeOnPage = Math.round((Date.now() - startTime) / 1000);

      // Use sendBeacon for reliable unload tracking
      navigator.sendBeacon(
        "/api/webhooks/meta",
        JSON.stringify({
          type: "page_engagement",
          funnelId,
          pageSlug,
          variantId,
          timeOnPageSeconds: timeOnPage,
          scrollDepth: maxScrollDepth,
        })
      );
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [funnelId, pageSlug, variantId]);

  return null;
}
