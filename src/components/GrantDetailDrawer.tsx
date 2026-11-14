import { AlertCircle, ExternalLink, Info, X } from "lucide-react";
import { useEffect, useState } from "react";
import { DEMO_ASSUMPTION_NOTE } from "../types/grant.ts";
import type {
  AwardOutcome,
  GrantRecord,
  PipelineStage,
  StaffStatus,
} from "../types/grant.ts";
import {
  PIPELINE_STAGES,
  formatAwardRange,
  formatCurrency,
  formatDateShort,
  getDaysUntil,
  getGrantStatusLabel,
  getProgramName,
  getStaffStatusLabel,
} from "../utils/formatters.ts";
import {
  CompetitivenessText,
  EligibilityText,
  RequirementDeterminationText,
} from "./StatusText.tsx";

interface WorkflowPatchPayload {
  pipeline_stage?: PipelineStage;
  assigned_owner?: string | null;
  internal_notes?: string | null;
  staff_status?: StaffStatus;
  award_outcome?: AwardOutcome;
  amount_awarded_usd?: number | null;
}

interface GrantDetailDrawerProps {
  grant: GrantRecord | null;
  onClose: () => void;
  onUpdateWorkflow: (grantId: string, patch: WorkflowPatchPayload) => Promise<void>;
}

export function GrantDetailDrawer({
  grant,
  onClose,
  onUpdateWorkflow,
}: GrantDetailDrawerProps) {
  const [ownerDraft, setOwnerDraft] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [awardedAmountDraft, setAwardedAmountDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!grant) return;
    setOwnerDraft(grant.workflow.assigned_owner ?? "");
    setNotesDraft(grant.workflow.internal_notes ?? "");
    setAwardedAmountDraft(
      grant.workflow.amount_awarded_usd !== null
        ? String(grant.workflow.amount_awarded_usd)
        : ""
    );
  }, [grant]);

  useEffect(() => {
    if (!grant) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [grant, onClose]);

  if (!grant) return null;

  const daysUntilDeadline = getDaysUntil(grant.cycle.deadline);

  const handleSaveNotesAndOwner = async () => {
    setIsSaving(true);
    try {
      const parsedAward =
        awardedAmountDraft.trim() === "" ? null : Number(awardedAmountDraft.trim());
      await onUpdateWorkflow(grant.grant_id, {
        assigned_owner: ownerDraft.trim() || null,
        internal_notes: notesDraft.trim() || null,
        amount_awarded_usd:
          parsedAward !== null && !Number.isNaN(parsedAward) ? parsedAward : null,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/35"
      role="dialog"
      aria-modal="true"
      aria-labelledby="grant-detail-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white h-full overflow-y-auto border-l border-slate-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Sticky Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div
              className={`text-xs font-medium flex items-center gap-1.5 ${
                grant.is_demo_data ? "text-amber-800" : "text-teal-800"
              }`}
            >
              <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>
                {grant.is_demo_data ? "Synthetic Demo Record" : "Real Grant · Found with Gemini"} ·{" "}
                {grant.dashboard.category ?? "Grant Opportunity"}
              </span>
            </div>
            <h2
              id="grant-detail-title"
              className="mt-1 text-xl font-semibold text-slate-900 leading-snug"
            >
              {grant.name}
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              {grant.funder} · {grant.dashboard.geographic_scope}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close grant details"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-8 flex-1">
          {/* Workflow Controls Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div>
              <label
                htmlFor="detail-pipeline-stage"
                className="block text-xs font-medium text-slate-600 mb-1"
              >
                Pipeline Stage
              </label>
              <select
                id="detail-pipeline-stage"
                value={grant.workflow.pipeline_stage}
                onChange={(e) =>
                  onUpdateWorkflow(grant.grant_id, {
                    pipeline_stage: e.target.value as PipelineStage,
                  })
                }
                className="w-full px-2.5 py-2 text-sm bg-white border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-teal-600"
              >
                {PIPELINE_STAGES.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="detail-staff-status"
                className="block text-xs font-medium text-slate-600 mb-1"
              >
                Staff Review Status
              </label>
              <select
                id="detail-staff-status"
                value={grant.dashboard.staff_status}
                onChange={(e) =>
                  onUpdateWorkflow(grant.grant_id, {
                    staff_status: e.target.value as StaffStatus,
                  })
                }
                className="w-full px-2.5 py-2 text-sm bg-white border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-teal-600"
              >
                {(
                  ["new", "saved", "reviewing", "applying", "submitted", "dismissed"] as StaffStatus[]
                ).map((s) => (
                  <option key={s} value={s}>
                    {getStaffStatusLabel(s)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="detail-assigned-owner"
                className="block text-xs font-medium text-slate-600 mb-1"
              >
                Assigned Owner
              </label>
              <input
                id="detail-assigned-owner"
                type="text"
                value={ownerDraft}
                onChange={(e) => setOwnerDraft(e.target.value)}
                onBlur={handleSaveNotesAndOwner}
                placeholder="Unassigned"
                className="w-full px-2.5 py-2 text-sm bg-white border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          {/* Key Evaluation Numbers */}
          <section aria-label="Evaluation summary">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-6 pb-6 border-b border-slate-200">
              <div>
                <div className="text-xs text-slate-500">Recommended Request</div>
                <div className="mt-1 text-lg font-semibold text-slate-900 font-mono tabular-nums">
                  {formatCurrency(grant.funding.recommended_request_usd)}
                </div>
                <div className="text-xs text-slate-500 font-mono tabular-nums">
                  Range: {formatAwardRange(grant.funding.minimum_award, grant.funding.maximum_award)}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500">Requirements Checked</div>
                <div className="mt-1.5 text-sm font-semibold text-slate-900 font-mono tabular-nums">
                  {grant.analysis.mandatory_requirements_confirmed_percent !== null
                    ? `${grant.analysis.mandatory_requirements_confirmed_percent}% confirmed`
                    : "Not checked yet"}
                </div>
                {grant.data_quality.notes.includes(DEMO_ASSUMPTION_NOTE) && (
                  <div className="mt-1 text-[11px] text-amber-700 leading-snug">
                    Based on demo assumptions about Tech-Moms
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs text-slate-500">Strategic Fit & Priority</div>
                <div className="mt-1 text-lg font-semibold text-slate-900 font-mono tabular-nums">
                  {grant.analysis.strategic_fit_percent ?? "—"}%
                </div>
                <div className="text-xs text-slate-500 font-mono tabular-nums">
                  Priority score: {grant.analysis.priority_score ?? "—"} / 100
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500">Competitiveness</div>
                <div className="mt-1.5">
                  <CompetitivenessText band={grant.analysis.competitiveness_band} />
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Win prob:{" "}
                  {grant.analysis.win_probability_percent !== null
                    ? `${grant.analysis.win_probability_percent}%`
                    : "Unknown"}
                </div>
              </div>
            </div>
          </section>

          {/* Why Tech-Moms Qualifies */}
          <section aria-label="Why Tech-Moms qualifies" className="space-y-3">
            <h3 className="text-base font-semibold text-slate-900">Why Tech-Moms Qualifies</h3>
            {grant.analysis.strategic_fit_rationale && (
              <p className="text-sm text-slate-700 leading-relaxed">
                {grant.analysis.strategic_fit_rationale}
              </p>
            )}

            {grant.analysis.matched_program_ids.length > 0 && (
              <div className="text-xs text-slate-600">
                <span className="font-medium text-slate-800">Matched Tech-Moms Programs: </span>
                <span>
                  {grant.analysis.matched_program_ids.map(getProgramName).join(" · ")}
                </span>
              </div>
            )}

            {grant.funding.recommendation_basis && (
              <div className="text-xs text-slate-600">
                <span className="font-medium text-slate-800">Request Sizing Basis: </span>
                <span>{grant.funding.recommendation_basis}</span>
              </div>
            )}

            {grant.analysis.strengths.length > 0 && (
              <ul className="space-y-1.5 text-sm text-slate-700 list-disc pl-5">
                {grant.analysis.strengths.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            )}
          </section>

          {/* Missing Eligibility Information & Risks */}
          {(grant.analysis.missing_information_questions.length > 0 ||
            grant.analysis.risks.length > 0 ||
            grant.data_quality.missing_fields.length > 0) && (
            <section
              aria-label="Missing eligibility information"
              className="pt-6 border-t border-slate-200 space-y-3"
            >
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
                <span>Missing Eligibility Information & Verification Risks</span>
              </h3>

              {grant.analysis.missing_information_questions.length > 0 && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-md p-4 space-y-2">
                  <div className="text-xs font-semibold text-amber-900">
                    Questions for Tech-Moms Staff Before Applying
                  </div>
                  <ul className="space-y-1.5 text-sm text-amber-950 list-disc pl-5">
                    {grant.analysis.missing_information_questions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}

              {grant.analysis.risks.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-slate-600 mb-1.5">
                    Key Risks & Constraints
                  </div>
                  <ul className="space-y-1.5 text-sm text-slate-700 list-disc pl-5">
                    {grant.analysis.risks.map((risk, i) => (
                      <li key={i}>{risk}</li>
                    ))}
                  </ul>
                </div>
              )}

              {grant.data_quality.missing_fields.length > 0 && (
                <div className="text-xs text-slate-500">
                  <span className="font-medium text-slate-700">Unverified / Missing Fields: </span>
                  <span className="font-mono">{grant.data_quality.missing_fields.join(", ")}</span>
                </div>
              )}
            </section>
          )}

          {/* Funding Requirements */}
          <section
            aria-label="Funding requirements"
            className="pt-6 border-t border-slate-200 space-y-3"
          >
            <h3 className="text-base font-semibold text-slate-900">
              Funding Requirements & Gate Checks
            </h3>
            {grant.requirements.length === 0 && (
              <p className="text-xs text-slate-600 border border-dashed border-slate-300 rounded-md p-3.5 leading-relaxed">
                Requirements have not been read yet. Use <strong>Evaluate Grants</strong> in the header
                to have Gemini read the funder's page, or open the official page and check eligibility
                by hand.
              </p>
            )}
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-md">
              {grant.requirements.map((req, idx) => (
                <div key={idx} className="p-3.5 space-y-1.5 bg-white">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="text-sm font-medium text-slate-900 flex-1 min-w-[200px]">
                      {req.requirement}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-slate-500">
                        {req.mandatory ? "Mandatory" : "Preference"}
                      </span>
                      <RequirementDeterminationText determination={req.determination} />
                    </div>
                  </div>
                  <p className="text-xs text-slate-700">{req.reason}</p>
                  {req.techmoms_evidence && (
                    <p className="text-xs text-slate-500">
                      <span className="font-medium text-slate-600">Tech-Moms Evidence: </span>
                      {req.techmoms_evidence}
                    </p>
                  )}
                  {req.source_quote_or_excerpt && (
                    <p className="text-xs text-slate-500 italic">
                      “{req.source_quote_or_excerpt}”
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Application Effort & Deadlines */}
          <section
            aria-label="Application effort and deadlines"
            className="pt-6 border-t border-slate-200 space-y-4"
          >
            <h3 className="text-base font-semibold text-slate-900">
              Application Effort, Financials & Deadlines
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Application Status</span>
                  <span className="font-medium text-slate-900">
                    {getGrantStatusLabel(grant.status)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Opens On</span>
                  <span className="font-mono tabular-nums text-slate-900">
                    {formatDateShort(grant.cycle.opens_on)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">LOI Deadline</span>
                  <span className="font-mono tabular-nums text-slate-900">
                    {grant.cycle.letter_of_intent_deadline
                      ? formatDateShort(grant.cycle.letter_of_intent_deadline)
                      : "Not required"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Submission Deadline</span>
                  <span className="font-mono tabular-nums font-medium text-slate-900">
                    {formatDateShort(grant.cycle.deadline)}
                    {daysUntilDeadline !== null && daysUntilDeadline >= 0
                      ? ` (${daysUntilDeadline}d)`
                      : ""}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Expected Decision / Award</span>
                  <span className="font-mono tabular-nums text-slate-900">
                    {formatDateShort(grant.cycle.decision_date)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Estimated Effort</span>
                  <span className="font-mono tabular-nums font-medium text-slate-900">
                    {grant.application.estimated_hours ?? "—"} hrs ({grant.application.application_complexity})
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Matching Funds Required</span>
                  <span className="font-mono tabular-nums text-slate-900">
                    {grant.funding.matching_funds_required
                      ? `Yes (${grant.funding.matching_percentage ?? "?"}%)`
                      : "No"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Overhead / Indirect Cap</span>
                  <span className="font-mono tabular-nums text-slate-900">
                    {grant.funding.indirect_cost_rate_cap_percent !== null
                      ? `${grant.funding.indirect_cost_rate_cap_percent}%`
                      : "Unspecified"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Expected Awards in Pool</span>
                  <span className="font-mono tabular-nums text-slate-900">
                    {grant.funding.number_of_awards ?? "Unspecified"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Submission Method</span>
                  <span className="text-slate-900">
                    {grant.application.submission_method ?? "Unspecified"}
                  </span>
                </div>
              </div>
            </div>

            {grant.application.hours_estimate_basis && (
              <p className="text-xs text-slate-600">
                <span className="font-medium text-slate-800">Effort Basis: </span>
                {grant.application.hours_estimate_basis}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <div className="font-medium text-slate-800 mb-1">Required Attachments</div>
                {grant.application.required_attachments.length > 0 ? (
                  <ul className="list-disc pl-4 space-y-1 text-slate-600">
                    {grant.application.required_attachments.map((att, i) => (
                      <li key={i}>{att}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500">None listed</p>
                )}
              </div>

              <div>
                <div className="font-medium text-slate-800 mb-1">Allowed Costs</div>
                {grant.funding.allowed_costs.length > 0 ? (
                  <ul className="list-disc pl-4 space-y-1 text-slate-600">
                    {grant.funding.allowed_costs.map((cost, i) => (
                      <li key={i}>{cost}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500">Unspecified</p>
                )}
              </div>
            </div>
          </section>

          {/* Source Links */}
          <section
            aria-label="Source links"
            className="pt-6 border-t border-slate-200 space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-slate-900">Source Links</h3>
              <span className="text-xs text-slate-500">
                {grant.is_demo_data ? "Synthetic demo placeholders · " : "Found by Gemini · "}
                Last checked {formatDateShort(grant.last_verified_at)}
              </span>
            </div>
            <div className="space-y-1.5 text-xs">
              {grant.official_url && (
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-28 text-slate-500 shrink-0">Official Page</span>
                  <span className="inline-flex items-center gap-1 font-mono text-slate-600 truncate">
                    <ExternalLink className="w-3 h-3 shrink-0 text-slate-400" aria-hidden="true" />
                    <UrlText url={grant.official_url} isDemo={grant.is_demo_data} />
                    {grant.is_demo_data && (
                      <span className="text-amber-700 ml-1 shrink-0">(Demo Placeholder)</span>
                    )}
                  </span>
                </div>
              )}
              {grant.application_url && (
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-28 text-slate-500 shrink-0">Application Portal</span>
                  <span className="inline-flex items-center gap-1 font-mono text-slate-600 truncate">
                    <ExternalLink className="w-3 h-3 shrink-0 text-slate-400" aria-hidden="true" />
                    <UrlText url={grant.application_url} isDemo={grant.is_demo_data} />
                    {grant.is_demo_data && (
                      <span className="text-amber-700 ml-1 shrink-0">(Demo Placeholder)</span>
                    )}
                  </span>
                </div>
              )}
              {grant.source_urls.map((url, idx) => (
                <div key={idx} className="flex items-center gap-2 text-slate-700">
                  <span className="w-28 text-slate-500 shrink-0">Guidelines URL</span>
                  <span className="inline-flex items-center gap-1 font-mono text-slate-600 truncate">
                    <ExternalLink className="w-3 h-3 shrink-0 text-slate-400" aria-hidden="true" />
                    <UrlText url={url} isDemo={grant.is_demo_data} />
                    {grant.is_demo_data && (
                      <span className="text-amber-700 ml-1 shrink-0">(Demo Placeholder)</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Staff Notes & Award Outcome */}
          <section
            aria-label="Staff notes and outcome"
            className="pt-6 border-t border-slate-200 space-y-3"
          >
            <h3 className="text-base font-semibold text-slate-900">Staff Notes & Outcome</h3>

            {grant.workflow.pipeline_stage === "award_decided" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2">
                <div>
                  <label
                    htmlFor="detail-award-outcome"
                    className="block text-xs font-medium text-slate-600 mb-1"
                  >
                    Award Outcome
                  </label>
                  <select
                    id="detail-award-outcome"
                    value={grant.workflow.award_outcome}
                    onChange={(e) =>
                      onUpdateWorkflow(grant.grant_id, {
                        award_outcome: e.target.value as AwardOutcome,
                      })
                    }
                    className="w-full px-2.5 py-2 text-sm bg-white border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-teal-600"
                  >
                    <option value="awarded">Awarded</option>
                    <option value="declined">Declined</option>
                    <option value="pending">Pending</option>
                    <option value="withdrawn">Withdrawn</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="detail-amount-awarded"
                    className="block text-xs font-medium text-slate-600 mb-1"
                  >
                    Amount Awarded (USD)
                  </label>
                  <input
                    id="detail-amount-awarded"
                    type="number"
                    min="0"
                    value={awardedAmountDraft}
                    onChange={(e) => setAwardedAmountDraft(e.target.value)}
                    placeholder="0"
                    className="w-full px-2.5 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="detail-internal-notes"
                className="block text-xs font-medium text-slate-600 mb-1"
              >
                Internal Staff Notes
              </label>
              <textarea
                id="detail-internal-notes"
                rows={3}
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                placeholder="Add eligibility follow-ups, match funding notes, or review dates..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleSaveNotesAndOwner}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-60 rounded-md transition-colors cursor-pointer"
              >
                {isSaving ? "Saving..." : "Save Staff Updates"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/** Demo URLs are fake, so they stay plain text. Real URLs open the funder's page in a new tab. */
function UrlText({ url, isDemo }: { url: string; isDemo: boolean }) {
  if (isDemo) return <span className="truncate">{url}</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="truncate text-teal-800 hover:underline"
    >
      {url}
    </a>
  );
}
