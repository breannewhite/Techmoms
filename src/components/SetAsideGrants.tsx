import { ChevronDown } from "lucide-react";
import type { GrantRecord } from "../types/grant.ts";
import { MIN_FIT_PERCENT, type SetAsideItem, type SetAsideKind } from "../utils/setAside.ts";

interface SetAsideGrantsProps {
  items: SetAsideItem[];
  onSelectGrant: (grant: GrantRecord) => void;
}

const GROUP_LABELS: Record<SetAsideKind, string> = {
  ineligible: "Not eligible",
  low_fit: `Low fit (below ${MIN_FIT_PERCENT}%)`,
  broken_link: "Link looks broken",
};

/** Collapsed list of grants that are probably not worth pursuing, each with the reason. */
export function SetAsideGrants({ items, onSelectGrant }: SetAsideGrantsProps) {
  if (items.length === 0) return null;

  const kinds = (Object.keys(GROUP_LABELS) as SetAsideKind[]).filter((k) => items.some((i) => i.kind === k));

  return (
    <details className="group bg-white border border-slate-200 rounded-lg">
      <summary className="px-5 py-4 flex items-center justify-between gap-3 cursor-pointer list-none">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Set aside ({items.length}): probably not worth pursuing
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Not eligible, a poor fit, or a broken link. They are kept here so you can double-check them,
            and they are left out of the totals above.
          </p>
        </div>
        <ChevronDown
          className="w-4 h-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>

      <div className="border-t border-slate-200 px-5 py-4 space-y-5">
        {kinds.map((kind) => (
          <section key={kind} aria-label={GROUP_LABELS[kind]}>
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              {GROUP_LABELS[kind]} ({items.filter((i) => i.kind === kind).length})
            </h3>
            <ul className="mt-2 divide-y divide-slate-100">
              {items
                .filter((i) => i.kind === kind)
                .map(({ grant, reason }) => (
                  <li key={grant.grant_id}>
                    <button
                      type="button"
                      onClick={() => onSelectGrant(grant)}
                      className="w-full text-left py-2.5 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-4 hover:bg-slate-50 rounded-md px-2 -mx-2 cursor-pointer"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-900 truncate">{grant.name}</span>
                        <span className="block text-xs text-slate-500 truncate">{grant.funder}</span>
                      </span>
                      <span className="text-xs text-slate-600 sm:max-w-md sm:text-right">{reason}</span>
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </details>
  );
}
