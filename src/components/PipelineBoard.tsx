import { ChevronLeft, ChevronRight } from "lucide-react";
import type { GrantRecord, PipelineStage } from "../types/grant.ts";
import {
  PIPELINE_STAGES,
  formatCurrency,
  formatDateShort,
} from "../utils/formatters.ts";
import { EligibilityText } from "./StatusText.tsx";

interface PipelineBoardProps {
  grants: GrantRecord[];
  onSelectGrant: (grant: GrantRecord) => void;
  onMoveStage: (grantId: string, nextStage: PipelineStage) => Promise<void>;
}

export function PipelineBoard({
  grants,
  onSelectGrant,
  onMoveStage,
}: PipelineBoardProps) {
  const visibleGrants = grants.filter((g) => g.dashboard.staff_status !== "dismissed");

  return (
    <section aria-label="Grant pipeline stages" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          Track grants from initial discovery through submission and award decision. Click any grant card to view requirements or move it across stages.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-start">
        {PIPELINE_STAGES.map((stage, stageIndex) => {
          const stageGrants = visibleGrants.filter(
            (g) => g.workflow.pipeline_stage === stage.id
          );
          const stageTotalUsd = stageGrants.reduce((sum, g) => {
            if (stage.id === "award_decided" && g.workflow.amount_awarded_usd !== null) {
              return sum + g.workflow.amount_awarded_usd;
            }
            return sum + (g.funding.recommended_request_usd ?? 0);
          }, 0);

          return (
            <div
              key={stage.id}
              className="bg-slate-100/80 border border-slate-200 rounded-lg p-3 flex flex-col gap-3 min-h-[420px]"
            >
              {/* Column Header */}
              <div className="pb-2 border-b border-slate-200/80">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">{stage.label}</h3>
                  <span className="text-xs font-mono tabular-nums font-medium text-slate-600">
                    {stageGrants.length}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                  <span className="truncate">{stage.description}</span>
                </div>
                <div className="mt-1.5 text-xs font-mono tabular-nums text-slate-700 font-medium">
                  {stage.id === "award_decided" ? "Awarded: " : "Ask Total: "}
                  {formatCurrency(stageTotalUsd)}
                </div>
              </div>

              {/* Cards */}
              {stageGrants.length === 0 ? (
                <div className="py-8 px-3 text-center text-xs text-slate-500">
                  No grants in {stage.label}.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {stageGrants.map((grant) => {
                    const prevStage = stageIndex > 0 ? PIPELINE_STAGES[stageIndex - 1] : null;
                    const nextStage =
                      stageIndex < PIPELINE_STAGES.length - 1
                        ? PIPELINE_STAGES[stageIndex + 1]
                        : null;

                    return (
                      <article
                        key={grant.grant_id}
                        className="bg-white border border-slate-200 rounded-md p-3 hover:border-slate-300 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => onSelectGrant(grant)}
                          className="w-full text-left cursor-pointer focus:outline-none"
                        >
                          <div className="text-sm font-medium text-slate-900 leading-snug hover:text-teal-800">
                            {grant.name}
                          </div>
                          <div className="mt-1 text-xs text-slate-500 truncate">
                            {grant.funder}
                          </div>

                          <div className="mt-2.5 flex items-center justify-between gap-2 text-xs">
                            <span className="font-mono tabular-nums font-semibold text-slate-900">
                              {grant.workflow.pipeline_stage === "award_decided" &&
                              grant.workflow.amount_awarded_usd !== null
                                ? `${formatCurrency(grant.workflow.amount_awarded_usd)} awarded`
                                : grant.funding.recommended_request_usd !== null
                                  ? formatCurrency(grant.funding.recommended_request_usd)
                                  : "No request"}
                            </span>
                            <span className="font-mono tabular-nums text-slate-600">
                              Fit {grant.analysis.strategic_fit_percent ?? "—"}%
                            </span>
                          </div>

                          <div className="mt-2 flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                            <EligibilityText status={grant.analysis.eligibility_status} />
                            <span className="text-xs font-mono tabular-nums text-slate-500">
                              {formatDateShort(grant.cycle.deadline)}
                            </span>
                          </div>
                        </button>

                        {/* Stage Move Controls */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                          <span className="text-slate-500 truncate">
                            {grant.workflow.assigned_owner ?? "Unassigned"}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {prevStage && (
                              <button
                                type="button"
                                onClick={() => onMoveStage(grant.grant_id, prevStage.id)}
                                title={`Move back to ${prevStage.label}`}
                                aria-label={`Move ${grant.name} back to ${prevStage.label}`}
                                className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {nextStage && (
                              <button
                                type="button"
                                onClick={() => onMoveStage(grant.grant_id, nextStage.id)}
                                title={`Advance to ${nextStage.label}`}
                                aria-label={`Advance ${grant.name} to ${nextStage.label}`}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-teal-700 hover:text-teal-900 hover:bg-teal-50 rounded font-medium transition-colors cursor-pointer"
                              >
                                <span>{nextStage.label}</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
