import { ArrowDown, ArrowUp, ArrowUpDown, RotateCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type {
  CompetitivenessBand,
  EligibilityStatus,
  GrantRecord,
  PipelineStage,
} from "../types/grant.ts";
import {
  PIPELINE_STAGES,
  formatAwardRange,
  formatCurrency,
  formatDateShort,
  getDaysUntil,
  getGrantStatusLabel,
  getStageLabel,
} from "../utils/formatters.ts";
import { CompetitivenessText, EligibilityText } from "./StatusText.tsx";

type SortKey =
  | "name"
  | "award"
  | "geographic_scope"
  | "eligibility"
  | "fit"
  | "competitiveness"
  | "deadline";

type SortDirection = "asc" | "desc";

interface GrantTableProps {
  grants: GrantRecord[];
  isLoading: boolean;
  selectedGrantId: string | null;
  onSelectGrant: (grant: GrantRecord) => void;
}

const ELIGIBILITY_RANK: Record<EligibilityStatus, number> = {
  eligible: 1,
  needs_verification: 2,
  unknown: 3,
  ineligible: 4,
};

const COMPETITIVENESS_RANK: Record<CompetitivenessBand, number> = {
  low: 1,
  medium: 2,
  high: 3,
  unknown: 4,
};

export function GrantTable({
  grants,
  isLoading,
  selectedGrantId,
  onSelectGrant,
}: GrantTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [eligibilityFilter, setEligibilityFilter] = useState<EligibilityStatus | "all">("all");
  const [stageFilter, setStageFilter] = useState<PipelineStage | "all">("all");
  const [geoFilter, setGeoFilter] = useState<string>("all");
  const [competitivenessFilter, setCompetitivenessFilter] = useState<CompetitivenessBand | "all">(
    "all"
  );
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [showDismissed, setShowDismissed] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>("fit");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const availableTopics = useMemo(() => {
    const set = new Set<string>();
    for (const grant of grants) {
      for (const topic of grant.scope.topics) {
        set.add(topic);
      }
    }
    return Array.from(set).sort();
  }, [grants]);

  const filteredGrants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return grants.filter((grant) => {
      if (!showDismissed && grant.dashboard.staff_status === "dismissed") {
        return false;
      }
      if (eligibilityFilter !== "all" && grant.analysis.eligibility_status !== eligibilityFilter) {
        return false;
      }
      if (stageFilter !== "all" && grant.workflow.pipeline_stage !== stageFilter) {
        return false;
      }
      if (geoFilter !== "all" && grant.scope.geographic_level !== geoFilter) {
        return false;
      }
      if (
        competitivenessFilter !== "all" &&
        grant.analysis.competitiveness_band !== competitivenessFilter
      ) {
        return false;
      }
      if (topicFilter !== "all" && !grant.scope.topics.includes(topicFilter)) {
        return false;
      }
      if (q) {
        const haystack = [
          grant.name,
          grant.funder,
          grant.dashboard.geographic_scope ?? "",
          ...grant.scope.topics,
          ...grant.analysis.matched_program_ids,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [
    grants,
    showDismissed,
    eligibilityFilter,
    stageFilter,
    geoFilter,
    competitivenessFilter,
    topicFilter,
    searchQuery,
  ]);

  const sortedGrants = useMemo(() => {
    const list = [...filteredGrants];
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "award": {
          const valA = a.funding.recommended_request_usd ?? a.funding.maximum_award ?? -1;
          const valB = b.funding.recommended_request_usd ?? b.funding.maximum_award ?? -1;
          cmp = valA - valB;
          break;
        }
        case "geographic_scope":
          cmp = (a.dashboard.geographic_scope ?? "").localeCompare(
            b.dashboard.geographic_scope ?? ""
          );
          break;
        case "eligibility":
          cmp =
            ELIGIBILITY_RANK[a.analysis.eligibility_status] -
            ELIGIBILITY_RANK[b.analysis.eligibility_status];
          break;
        case "fit":
          cmp = (a.analysis.strategic_fit_percent ?? -1) - (b.analysis.strategic_fit_percent ?? -1);
          break;
        case "competitiveness":
          cmp =
            COMPETITIVENESS_RANK[a.analysis.competitiveness_band] -
            COMPETITIVENESS_RANK[b.analysis.competitiveness_band];
          break;
        case "deadline": {
          const dA = a.cycle.deadline ? new Date(a.cycle.deadline).getTime() : Number.MAX_SAFE_INTEGER;
          const dB = b.cycle.deadline ? new Date(b.cycle.deadline).getTime() : Number.MAX_SAFE_INTEGER;
          cmp = dA - dB;
          break;
        }
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return list;
  }, [filteredGrants, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection(key === "fit" || key === "award" ? "desc" : "asc");
    }
  };

  const hasActiveFilters =
    searchQuery !== "" ||
    eligibilityFilter !== "all" ||
    stageFilter !== "all" ||
    geoFilter !== "all" ||
    competitivenessFilter !== "all" ||
    topicFilter !== "all" ||
    showDismissed;

  const resetFilters = () => {
    setSearchQuery("");
    setEligibilityFilter("all");
    setStageFilter("all");
    setGeoFilter("all");
    setCompetitivenessFilter("all");
    setTopicFilter("all");
    setShowDismissed(false);
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
    );
  };

  return (
    <section
      aria-label="Grant opportunities table"
      className="bg-white border border-slate-200 rounded-lg overflow-hidden"
    >
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-200 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search grant name, funder, or topic..."
              aria-label="Search grants"
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Segmented eligibility filter */}
            <div
              role="group"
              aria-label="Filter by eligibility status"
              className="inline-flex items-center p-1 bg-slate-100 rounded-md"
            >
              {(
                [
                  { id: "all", label: "All" },
                  { id: "eligible", label: "Eligible" },
                  { id: "needs_verification", label: "Verify" },
                  { id: "ineligible", label: "Ineligible" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setEligibilityFilter(tab.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    eligibilityFilter === tab.id
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Secondary select filters */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <select
            aria-label="Filter by pipeline stage"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as PipelineStage | "all")}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:border-teal-600"
          >
            <option value="all">Stage: All</option>
            {PIPELINE_STAGES.map((stage) => (
              <option key={stage.id} value={stage.id}>
                Stage: {stage.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by funding focus topic"
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:border-teal-600"
          >
            <option value="all">Focus: All Topics</option>
            {availableTopics.map((topic) => (
              <option key={topic} value={topic}>
                Focus: {topic}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by geographic scope"
            value={geoFilter}
            onChange={(e) => setGeoFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:border-teal-600"
          >
            <option value="all">Geography: All</option>
            <option value="local">Local (Wasatch Front)</option>
            <option value="state">State (Utah)</option>
            <option value="regional">Regional</option>
            <option value="national">National</option>
          </select>

          <select
            aria-label="Filter by competitiveness"
            value={competitivenessFilter}
            onChange={(e) => setCompetitivenessFilter(e.target.value as CompetitivenessBand | "all")}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:border-teal-600"
          >
            <option value="all">Competitiveness: All</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          <label className="inline-flex items-center gap-1.5 text-slate-600 ml-auto cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showDismissed}
              onChange={(e) => setShowDismissed(e.target.checked)}
              className="rounded border-slate-300 text-teal-700 focus:ring-teal-600"
            />
            <span>Include dismissed</span>
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-600">
              <th scope="col" className="py-3 pl-4 pr-3">
                <button
                  type="button"
                  onClick={() => handleSort("name")}
                  className="inline-flex items-center gap-1.5 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                >
                  <span>Grant Name</span>
                  {renderSortIcon("name")}
                </button>
              </th>
              <th scope="col" className="py-3 px-3 whitespace-nowrap">
                Funding Focus
              </th>
              <th scope="col" className="py-3 px-3 text-right">
                <button
                  type="button"
                  onClick={() => handleSort("award")}
                  className="inline-flex items-center gap-1.5 hover:text-slate-900 cursor-pointer whitespace-nowrap ml-auto"
                >
                  <span>Award Amount</span>
                  {renderSortIcon("award")}
                </button>
              </th>
              <th scope="col" className="py-3 px-3">
                <button
                  type="button"
                  onClick={() => handleSort("geographic_scope")}
                  className="inline-flex items-center gap-1.5 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                >
                  <span>Geographic Scope</span>
                  {renderSortIcon("geographic_scope")}
                </button>
              </th>
              <th scope="col" className="py-3 px-3">
                <button
                  type="button"
                  onClick={() => handleSort("eligibility")}
                  className="inline-flex items-center gap-1.5 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                >
                  <span>Eligibility Status</span>
                  {renderSortIcon("eligibility")}
                </button>
              </th>
              <th scope="col" className="py-3 px-3 text-right">
                <button
                  type="button"
                  onClick={() => handleSort("fit")}
                  className="inline-flex items-center gap-1.5 hover:text-slate-900 cursor-pointer whitespace-nowrap ml-auto"
                >
                  <span>Fit Score</span>
                  {renderSortIcon("fit")}
                </button>
              </th>
              <th scope="col" className="py-3 px-3">
                <button
                  type="button"
                  onClick={() => handleSort("competitiveness")}
                  className="inline-flex items-center gap-1.5 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                >
                  <span>Competitiveness</span>
                  {renderSortIcon("competitiveness")}
                </button>
              </th>
              <th scope="col" className="py-3 pl-3 pr-4 text-right">
                <button
                  type="button"
                  onClick={() => handleSort("deadline")}
                  className="inline-flex items-center gap-1.5 hover:text-slate-900 cursor-pointer whitespace-nowrap ml-auto"
                >
                  <span>Deadline</span>
                  {renderSortIcon("deadline")}
                </button>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 text-sm">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="py-3.5 pl-4 pr-3">
                    <div className="h-4 w-56 bg-slate-200 rounded" />
                    <div className="h-3 w-36 bg-slate-100 rounded mt-1.5" />
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="h-4 w-32 bg-slate-100 rounded" />
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <div className="h-4 w-20 bg-slate-200 rounded ml-auto" />
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="h-4 w-24 bg-slate-100 rounded" />
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="h-4 w-24 bg-slate-100 rounded" />
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <div className="h-4 w-12 bg-slate-200 rounded ml-auto" />
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="h-4 w-16 bg-slate-100 rounded" />
                  </td>
                  <td className="py-3.5 pl-3 pr-4 text-right">
                    <div className="h-4 w-24 bg-slate-100 rounded ml-auto" />
                  </td>
                </tr>
              ))
            ) : sortedGrants.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 px-4 text-center">
                  <p className="text-sm font-medium text-slate-900">
                    No grant opportunities match your current filters.
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Try clearing one or more filters to view all synthetic demo opportunities.
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Reset Filters</span>
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              sortedGrants.map((grant) => {
                const daysLeft = getDaysUntil(grant.cycle.deadline);
                const isSelected = selectedGrantId === grant.grant_id;
                const isClosed = grant.status === "closed";

                return (
                  <tr
                    key={grant.grant_id}
                    onClick={() => onSelectGrant(grant)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectGrant(grant);
                      }
                    }}
                    className={`cursor-pointer transition-colors focus:outline-none focus:bg-teal-50/60 ${
                      isSelected ? "bg-teal-50/70" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="py-3.5 pl-4 pr-3 align-top min-w-[260px]">
                      <div className="font-medium text-slate-900 leading-snug">{grant.name}</div>
                      <div className="mt-1 text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                        <span>{grant.funder}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-slate-600 font-medium">
                          {getStageLabel(grant.workflow.pipeline_stage)}
                        </span>
                        {grant.dashboard.staff_status === "dismissed" && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-red-700">Dismissed</span>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 align-top max-w-[220px]">
                      <div className="text-xs text-slate-700 leading-relaxed">
                        {grant.scope.topics.slice(0, 3).join(" · ")}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 align-top text-right whitespace-nowrap">
                      <div className="font-mono tabular-nums font-medium text-slate-900">
                        {grant.funding.recommended_request_usd !== null
                          ? formatCurrency(grant.funding.recommended_request_usd)
                          : "—"}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums">
                        {formatAwardRange(
                          grant.funding.minimum_award,
                          grant.funding.maximum_award
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 align-top whitespace-nowrap text-xs text-slate-700">
                      {grant.dashboard.geographic_scope ?? "Unspecified"}
                    </td>

                    <td className="py-3.5 px-3 align-top whitespace-nowrap">
                      <EligibilityText status={grant.analysis.eligibility_status} />
                      <div className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums">
                        {grant.analysis.mandatory_requirements_confirmed_percent !== null
                          ? `${grant.analysis.mandatory_requirements_confirmed_percent}% reqs verified`
                          : "Unverified"}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 align-top text-right whitespace-nowrap">
                      <div className="font-mono tabular-nums font-semibold text-slate-900">
                        {grant.analysis.strategic_fit_percent !== null
                          ? `${grant.analysis.strategic_fit_percent}%`
                          : "—"}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums">
                        Priority {grant.analysis.priority_score ?? "—"}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 align-top whitespace-nowrap">
                      <CompetitivenessText band={grant.analysis.competitiveness_band} />
                    </td>

                    <td className="py-3.5 pl-3 pr-4 align-top text-right whitespace-nowrap">
                      <div className="font-mono tabular-nums text-xs font-medium text-slate-900">
                        {formatDateShort(grant.cycle.deadline)}
                      </div>
                      <div
                        className={`mt-0.5 text-xs tabular-nums ${
                          !isClosed && daysLeft !== null && daysLeft >= 0 && daysLeft <= 21
                            ? "text-amber-700 font-medium"
                            : "text-slate-500"
                        }`}
                      >
                        {isClosed
                          ? getGrantStatusLabel(grant.status)
                          : daysLeft !== null && daysLeft >= 0
                            ? `${daysLeft}d left · ${getGrantStatusLabel(grant.status)}`
                            : getGrantStatusLabel(grant.status)}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer count */}
      <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs text-slate-500">
        <span className="tabular-nums">
          Showing {sortedGrants.length} of {grants.length} synthetic demo grants
        </span>
        <span>Click any row to inspect requirements, eligibility evidence, and workflow</span>
      </div>
    </section>
  );
}
