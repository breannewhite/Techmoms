import type { GrantRecord } from "../types/grant.ts";
import { formatCurrency } from "../utils/formatters.ts";

interface SummaryCardsProps {
  grants: GrantRecord[];
  priorityThreshold: number;
}

export function SummaryCards({ grants, priorityThreshold }: SummaryCardsProps) {
  const activePortfolio = grants.filter((g) => g.dashboard.staff_status !== "dismissed");

  const openCount = activePortfolio.filter((g) => g.status === "open").length;
  const upcomingCount = activePortfolio.filter(
    (g) => g.status === "upcoming" || g.status === "recurring_not_yet_open"
  ).length;
  const closedCount = activePortfolio.filter((g) => g.status === "closed").length;

  const potentialFundingUsd = activePortfolio.reduce((sum, grant) => {
    if (grant.analysis.eligibility_status === "ineligible") return sum;
    return sum + (grant.funding.recommended_request_usd ?? 0);
  }, 0);

  const highPriorityGrants = activePortfolio.filter(
    (g) => (g.analysis.priority_score ?? 0) >= priorityThreshold
  );
  const highPriorityEligibleCount = highPriorityGrants.filter(
    (g) => g.analysis.eligibility_status === "eligible"
  ).length;
  const highPriorityVerifyCount = highPriorityGrants.filter(
    (g) => g.analysis.eligibility_status === "needs_verification"
  ).length;

  return (
    <section aria-label="Portfolio summary metrics" className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium text-slate-600">Total Grant Opportunities</h2>
          <span className="text-xs text-slate-500">Demo Portfolio</span>
        </div>
        <p className="mt-2 text-3xl font-semibold text-slate-900 font-mono tabular-nums tracking-tight">
          {activePortfolio.length}
        </p>
        <p className="mt-2 text-xs text-slate-500 tabular-nums">
          {openCount} Open · {upcomingCount} Upcoming or Recurring · {closedCount} Closed
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium text-slate-600">Potential Funding</h2>
          <span className="text-xs text-slate-500">Recommended Ask</span>
        </div>
        <p className="mt-2 text-3xl font-semibold text-slate-900 font-mono tabular-nums tracking-tight">
          {formatCurrency(potentialFundingUsd)}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Sum of recommended requests (excludes ineligible; not guaranteed revenue)
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium text-slate-600">High-Priority Grants</h2>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            Priority ≥ {priorityThreshold}
          </span>
        </div>
        <p className="mt-2 text-3xl font-semibold text-teal-700 font-mono tabular-nums tracking-tight">
          {highPriorityGrants.length}
        </p>
        <p className="mt-2 text-xs text-slate-500 tabular-nums">
          {highPriorityEligibleCount} Confirmed Eligible · {highPriorityVerifyCount} Needs Verification
        </p>
      </div>
    </section>
  );
}
