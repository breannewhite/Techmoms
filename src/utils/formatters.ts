import type {
  CompetitivenessBand,
  EligibilityStatus,
  GrantStatus,
  PipelineStage,
  StaffStatus,
} from "../types/grant.ts";

export const PIPELINE_STAGES: Array<{ id: PipelineStage; label: string; description: string }> = [
  {
    id: "research",
    label: "Research",
    description: "Newly discovered or awaiting initial verification",
  },
  {
    id: "qualified",
    label: "Qualified",
    description: "Eligibility checked and prioritized for pursuit",
  },
  {
    id: "drafted",
    label: "Drafted",
    description: "Narrative, budget, and attachments in progress",
  },
  {
    id: "submitted",
    label: "Submitted",
    description: "Application transmitted; awaiting funder review",
  },
  {
    id: "award_decided",
    label: "Award Decided",
    description: "Terminal stage with award or decline outcome",
  },
];

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return "—";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatAwardRange(
  min: number | null,
  max: number | null
): string {
  if (min !== null && max !== null) {
    return `${formatCurrency(min)} – ${formatCurrency(max)}`;
  }
  if (max !== null) {
    return `Up to ${formatCurrency(max)}`;
  }
  if (min !== null) {
    return `From ${formatCurrency(min)}`;
  }
  return "Amount unspecified";
}

export function formatDateShort(isoDate: string | null | undefined): string {
  if (!isoDate) return "TBD";
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

export function getDaysUntil(isoDate: string | null | undefined, referenceDate = "2026-11-14"): number | null {
  if (!isoDate) return null;
  const target = new Date(`${isoDate}T00:00:00`).getTime();
  const ref = new Date(`${referenceDate}T00:00:00`).getTime();
  if (Number.isNaN(target) || Number.isNaN(ref)) return null;
  return Math.round((target - ref) / (1000 * 60 * 60 * 24));
}

export function getEligibilityLabel(status: EligibilityStatus): string {
  switch (status) {
    case "eligible":
      return "Eligible";
    case "needs_verification":
      return "Needs Verification";
    case "ineligible":
      return "Ineligible";
    case "unknown":
    default:
      return "Unknown";
  }
}

export function getCompetitivenessLabel(band: CompetitivenessBand): string {
  switch (band) {
    case "low":
      return "Low";
    case "medium":
      return "Medium";
    case "high":
      return "High";
    case "unknown":
    default:
      return "Unknown";
  }
}

export function getGrantStatusLabel(status: GrantStatus): string {
  switch (status) {
    case "open":
      return "Open";
    case "upcoming":
      return "Upcoming";
    case "recurring_not_yet_open":
      return "Recurring (Not Open)";
    case "closed":
      return "Closed";
    case "needs_verification":
    default:
      return "Needs Verification";
  }
}

export function getStageLabel(stage: PipelineStage): string {
  return PIPELINE_STAGES.find((s) => s.id === stage)?.label ?? stage;
}

export function getStaffStatusLabel(status: StaffStatus): string {
  switch (status) {
    case "new":
      return "New";
    case "saved":
      return "Saved";
    case "reviewing":
      return "Reviewing";
    case "applying":
      return "Applying";
    case "dismissed":
      return "Dismissed";
    case "submitted":
      return "Submitted";
  }
}

export function getProgramName(id: string): string {
  switch (id) {
    case "foundational":
      return "Tech-Moms Foundational Program";
    case "advanced":
      return "Tech-Moms 2.0";
    case "relaunch":
      return "Career Relaunch";
    case "literacy":
      return "Digital Literacy";
    default:
      return id;
  }
}
