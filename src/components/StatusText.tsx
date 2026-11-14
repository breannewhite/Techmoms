import { AlertTriangle, CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import type {
  CompetitivenessBand,
  EligibilityStatus,
  RequirementDetermination,
} from "../types/grant.ts";
import { getCompetitivenessLabel, getEligibilityLabel } from "../utils/formatters.ts";

export function EligibilityText({ status }: { status: EligibilityStatus }) {
  switch (status) {
    case "eligible":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{getEligibilityLabel(status)}</span>
        </span>
      );
    case "needs_verification":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{getEligibilityLabel(status)}</span>
        </span>
      );
    case "ineligible":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 whitespace-nowrap">
          <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{getEligibilityLabel(status)}</span>
        </span>
      );
    case "unknown":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">
          <HelpCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{getEligibilityLabel(status)}</span>
        </span>
      );
  }
}

export function RequirementDeterminationText({
  determination,
}: {
  determination: RequirementDetermination;
}) {
  switch (determination) {
    case "pass":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Pass</span>
        </span>
      );
    case "fail":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 whitespace-nowrap">
          <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Fail</span>
        </span>
      );
    case "unknown":
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 whitespace-nowrap">
          <HelpCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Needs Verification</span>
        </span>
      );
  }
}

export function CompetitivenessText({ band }: { band: CompetitivenessBand }) {
  const colorClass =
    band === "low"
      ? "text-emerald-700"
      : band === "medium"
        ? "text-slate-700"
        : band === "high"
          ? "text-amber-700"
          : "text-slate-500";

  return (
    <span className={`text-xs font-medium whitespace-nowrap ${colorClass}`}>
      {getCompetitivenessLabel(band)}
    </span>
  );
}
