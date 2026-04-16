"use client";

import { useEffect, useState } from "react";

/**
 * Sticky CTA bar that slides up from the bottom after the user scrolls past
 * the hero. Hidden when the visitor is at the top, hidden after they reach
 * the form so we don't double-prompt.
 */
export function StickyCTABar({
  headline,
  ctaText,
  ctaHref = "#cta",
}: {
  headline: string;
  ctaText: string;
  ctaHref?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      const scrolled = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const viewportHeight = window.innerHeight;
      const distanceFromBottom = docHeight - (scrolled + viewportHeight);

      // Show after scrolling past 600px, hide when within 400px of bottom
      setVisible(scrolled > 600 && distanceFromBottom > 400);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 transform transition-transform duration-300 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border-t border-blue-500/30 shadow-2xl backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <p className="text-sm md:text-base text-slate-200 font-medium line-clamp-2">
            {headline}
          </p>
          <a
            href={ctaHref}
            className="shrink-0 inline-flex items-center justify-center px-5 py-2.5 md:px-6 md:py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm md:text-base rounded-lg transition-colors whitespace-nowrap"
          >
            {ctaText}
          </a>
        </div>
      </div>
    </div>
  );
}
