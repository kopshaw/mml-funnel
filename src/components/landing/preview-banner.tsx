import Link from "next/link";
import { Eye } from "lucide-react";

/**
 * Banner shown when someone hits ?variant=... to preview a specific A/B
 * variant from the dashboard. Makes it obvious which variant is rendering
 * and gives one-click toggles to switch.
 */
export function PreviewBanner({
  variantLabel,
  otherVariants,
  slug,
}: {
  variantLabel: string;
  otherVariants: { id: string; variant_label: string }[];
  slug: string;
}) {
  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-slate-900 text-sm font-medium">
      <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          <span>
            Preview — <strong>{variantLabel}</strong> variant
          </span>
        </div>
        <div className="flex items-center gap-2">
          {otherVariants.map((v) => (
            <Link
              key={v.id}
              href={`/${slug}?variant=${v.id}`}
              className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold transition-colors"
            >
              Switch to {v.variant_label}
            </Link>
          ))}
          <Link
            href={`/${slug}`}
            className="px-3 py-1 bg-slate-900/20 hover:bg-slate-900/40 text-slate-900 rounded-md text-xs font-semibold transition-colors"
          >
            Exit preview
          </Link>
        </div>
      </div>
    </div>
  );
}
