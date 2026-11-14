import { AlertTriangle, CheckCircle2, FileWarning } from "lucide-react";
import type { ProvenanceType, TechMomsProfile } from "../types/grant.ts";
import { formatCurrency } from "../utils/formatters.ts";

interface OrgProfileViewProps {
  profile: TechMomsProfile | null;
  isLoading: boolean;
}

function ProvenanceTag({ type }: { type: ProvenanceType }) {
  switch (type) {
    case "public_website":
      return (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Public Website</span>
        </span>
      );
    case "unverified":
      return (
        <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-medium">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Unverified</span>
        </span>
      );
    case "synthetic_demo":
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs text-slate-600 font-medium">
          <FileWarning className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Synthetic Demo</span>
        </span>
      );
  }
}

export function OrgProfileView({ profile, isLoading }: OrgProfileViewProps) {
  if (isLoading || !profile) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 animate-pulse">
        <div className="h-5 w-48 bg-slate-200 rounded" />
        <div className="h-4 w-full bg-slate-100 rounded" />
        <div className="h-4 w-3/4 bg-slate-100 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Demo assumptions used when Gemini evaluates grants */}
      {profile.demo_assumptions && profile.demo_assumptions.length > 0 && (
        <section className="bg-white border border-amber-200 rounded-lg p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              Demo Assumptions Used in Grant Evaluations
            </h2>
            <ProvenanceTag type="synthetic_demo" />
          </div>
          <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
            These facts about Tech-Moms are invented for the hackathon demo and are not verified.
            Gemini treats them as true when it checks a grant's requirements, and any grant whose
            result depends on one is marked in its details. Replace them with confirmed facts before
            using this for real applications.
          </p>
          <ul className="space-y-1.5 text-sm text-slate-800 list-disc pl-5">
            {profile.demo_assumptions.map((assumption) => (
              <li key={assumption.id}>{assumption.statement}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Provenance Policy Header */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Tech-Moms Organization Matching Profile
            </h2>
            <p className="mt-1 text-sm text-slate-600 max-w-3xl">
              {profile.organization.mission.value}
            </p>
          </div>
          <div className="text-xs text-slate-500 font-mono tabular-nums shrink-0">
            Profile as of {profile.as_of} · Schema v{profile.schema_version}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <ProvenanceTag type="public_website" />
            <p className="mt-1 text-slate-600">{profile.provenance_policy.public_website}</p>
          </div>
          <div>
            <ProvenanceTag type="synthetic_demo" />
            <p className="mt-1 text-slate-600">{profile.provenance_policy.synthetic_demo}</p>
          </div>
          <div>
            <ProvenanceTag type="unverified" />
            <p className="mt-1 text-slate-600">{profile.provenance_policy.unverified}</p>
          </div>
        </div>
      </section>

      {/* Core Facts & Financials */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Organization & Eligibility Baseline
          </h3>
          <dl className="divide-y divide-slate-100 text-sm">
            <div className="py-2.5 flex items-center justify-between gap-4">
              <dt className="text-slate-600">Headquarters & Service State</dt>
              <dd className="flex items-center gap-3 text-right">
                <span className="font-medium text-slate-900">
                  {profile.organization.headquarters_state.value}
                </span>
                <ProvenanceTag type={profile.organization.headquarters_state.provenance} />
              </dd>
            </div>
            <div className="py-2.5 flex items-center justify-between gap-4">
              <dt className="text-slate-600">501(c)(3) Tax-Exempt Status</dt>
              <dd className="flex items-center gap-3 text-right">
                <span className="font-medium text-slate-900">
                  {profile.organization.tax_exempt_501c3.value ? "Reported Yes" : "No"}
                </span>
                <ProvenanceTag type={profile.organization.tax_exempt_501c3.provenance} />
              </dd>
            </div>
            <div className="py-2.5 flex items-center justify-between gap-4">
              <dt className="text-slate-600">IRS EIN</dt>
              <dd className="flex items-center gap-3 text-right">
                <span className="font-mono text-slate-900">
                  {profile.organization.ein.value ?? "Not Provided"}
                </span>
                <ProvenanceTag type={profile.organization.ein.provenance} />
              </dd>
            </div>
            <div className="py-2.5 flex items-center justify-between gap-4">
              <dt className="text-slate-600">Operating Budget</dt>
              <dd className="flex items-center gap-3 text-right">
                <span className="font-mono tabular-nums font-medium text-slate-900">
                  {formatCurrency(profile.organization.annual_operating_budget_usd.value)}
                </span>
                <ProvenanceTag
                  type={profile.organization.annual_operating_budget_usd.provenance}
                />
              </dd>
            </div>
            <div className="py-2.5 flex items-center justify-between gap-4">
              <dt className="text-slate-600">Available Cash Match</dt>
              <dd className="flex items-center gap-3 text-right">
                <span className="font-mono tabular-nums font-medium text-slate-900">
                  {formatCurrency(profile.organization.available_cash_match_usd.value)}
                </span>
                <ProvenanceTag type={profile.organization.available_cash_match_usd.provenance} />
              </dd>
            </div>
            <div className="py-2.5 flex items-center justify-between gap-4">
              <dt className="text-slate-600">Expand Outside Utah?</dt>
              <dd className="flex items-center gap-3 text-right">
                <span className="font-medium text-slate-900">
                  {profile.service_area.willing_to_expand_to_other_states.value ? "Yes" : "No"}
                </span>
                <ProvenanceTag
                  type={profile.service_area.willing_to_expand_to_other_states.provenance}
                />
              </dd>
            </div>
            <div className="py-2.5 flex items-center justify-between gap-4">
              <dt className="text-slate-600">Grant Effort Cap / Min Award</dt>
              <dd className="font-mono tabular-nums text-slate-900 text-right">
                {profile.grant_preferences.maximum_application_effort_hours.value}h max ·{" "}
                {formatCurrency(profile.grant_preferences.minimum_preferred_award_usd.value)} min
              </dd>
            </div>
          </dl>
        </section>

        {/* Reported Outcomes & Service Delivery */}
        <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">
              Reported Outcomes & Demographics
            </h3>
            <ProvenanceTag type={profile.outcomes.alumni_total.provenance} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="text-xs text-slate-500">Alumni Served</div>
              <div className="mt-1 text-xl font-semibold font-mono tabular-nums text-slate-900">
                {profile.outcomes.alumni_total.value}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Add’l Education</div>
              <div className="mt-1 text-xl font-semibold font-mono tabular-nums text-slate-900">
                {profile.outcomes.pursued_additional_education_percent.value}%
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">New Position</div>
              <div className="mt-1 text-xl font-semibold font-mono tabular-nums text-slate-900">
                {profile.outcomes.accepted_new_position_percent.value}%
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Pay Increase</div>
              <div className="mt-1 text-xl font-semibold font-mono tabular-nums text-slate-900">
                {profile.outcomes.received_pay_increase_percent.value}%
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-600">
            <div>
              <span className="font-medium text-slate-800">Locations: </span>
              <span>{profile.service_area.locations.value.join(" · ")}</span>
            </div>
            <div>
              <span className="font-medium text-slate-800">Primary Populations: </span>
              <span>{profile.populations.primary.value.join(" · ")}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-slate-800">Synthetic Cohort Demographics: </span>
              <span className="font-mono tabular-nums">
                {profile.populations.percent_low_income.value}% low-income ·{" "}
                {profile.populations.percent_unemployed_or_underemployed.value}%
                unemployed/underemployed · {profile.populations.percent_rural.value}% rural
              </span>
              <ProvenanceTag type="synthetic_demo" />
            </div>
          </div>
        </section>
      </div>

      {/* Programs */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">Tech-Moms Programs</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profile.programs.map((program) => (
            <div
              key={program.id}
              className="border border-slate-200 rounded-md p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-semibold text-slate-900">{program.name}</h4>
                <span className="text-xs font-mono tabular-nums text-slate-600 shrink-0">
                  {formatCurrency(program.annual_budget_usd.value)} ·{" "}
                  {program.annual_participants.value} learners/yr
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {program.description.value}
              </p>
              <div className="text-xs text-slate-500">
                {program.topics.join(" · ")}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
