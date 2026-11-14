export type GrantStatus =
  | "open"
  | "upcoming"
  | "recurring_not_yet_open"
  | "closed"
  | "needs_verification";

export type EligibilityStatus =
  | "eligible"
  | "ineligible"
  | "needs_verification"
  | "unknown";

export type RequirementDetermination = "pass" | "fail" | "unknown";

export type CompetitivenessBand = "low" | "medium" | "high" | "unknown";

export type StaffStatus =
  | "new"
  | "saved"
  | "reviewing"
  | "applying"
  | "dismissed"
  | "submitted";

export type PipelineStage =
  | "research"
  | "qualified"
  | "drafted"
  | "submitted"
  | "award_decided";

export type ApplicationComplexity = "low" | "medium" | "high" | "unknown";

export type AwardOutcome =
  | "awarded"
  | "declined"
  | "pending"
  | "withdrawn"
  | "unknown";

export interface GrantRequirement {
  requirement: string;
  mandatory: boolean;
  source_url: string | null;
  source_quote_or_excerpt: string | null;
  techmoms_evidence: string | null;
  determination: RequirementDetermination;
  reason: string;
}

export interface GrantRecord {
  schema_version: string;
  grant_id: string;
  is_demo_data: boolean;
  demo_note: string;
  name: string;
  funder: string;
  official_url: string | null;
  application_url: string | null;
  source_urls: string[];
  last_verified_at: string | null;
  discovered_at: string | null;
  status: GrantStatus;
  cycle: {
    opens_on: string | null;
    deadline: string | null;
    recurrence: string;
    next_expected_open_on: string | null;
    letter_of_intent_deadline: string | null;
    decision_date: string | null;
    award_date: string | null;
    deadline_type: string;
    cycle_notes: string | null;
  };
  funding: {
    currency: string;
    minimum_award: number | null;
    maximum_award: number | null;
    typical_award: number | null;
    total_program_funding: number | null;
    number_of_awards: number | null;
    matching_funds_required: boolean | null;
    matching_percentage: number | null;
    allowed_costs: string[];
    excluded_costs: string[];
    recommended_request_usd: number | null;
    recommendation_basis: string | null;
    overhead_allowed: boolean | null;
    indirect_cost_rate_cap_percent: number | null;
    overhead_restrictions: string | null;
    expected_value_usd: number | null;
    expected_value_basis: string | null;
  };
  scope: {
    geographic_level: string | null;
    eligible_states: string[];
    eligible_counties: string[];
    eligible_cities: string[];
    national: boolean | null;
    target_populations: string[];
    topics: string[];
    eligible_program_types: string[];
  };
  requirements: GrantRequirement[];
  analysis: {
    eligibility_status: EligibilityStatus;
    mandatory_requirements_confirmed_percent: number | null;
    strategic_fit_percent: number | null;
    strategic_fit_rationale: string | null;
    competitiveness_band: CompetitivenessBand;
    competition_evidence: string[];
    win_probability_percent: number | null;
    win_probability_method: string | null;
    priority_score: number | null;
    matched_program_ids: string[];
    strengths: string[];
    risks: string[];
    missing_information_questions: string[];
    application_effort_hours_estimate: number | null;
    recommended_action: string;
    win_probability_evidence: string[];
    expected_value_usd: number | null;
    expected_value_basis: string | null;
  };
  dashboard: {
    category: string | null;
    geographic_scope: string | null;
    staff_status: StaffStatus;
    /** Starred "save for later" flag, independent of staff_status. Falls back to staff_status === "saved" when unset. */
    is_saved?: boolean;
    dismissed_reason: string | null;
    staff_feedback: string | null;
    is_new: boolean;
    last_change_detected_at: string | null;
  };
  data_quality: {
    verified_from_primary_source: boolean;
    confidence: string;
    missing_fields: string[];
    notes: string[];
  };
  application: {
    letter_of_intent_required: boolean | null;
    application_complexity: ApplicationComplexity;
    estimated_hours: number | null;
    hours_estimate_basis: string | null;
    required_attachments: string[];
    prerequisites: string[];
    submission_method: string | null;
    application_instructions_url: string | null;
  };
  workflow: {
    pipeline_stage: PipelineStage;
    assigned_owner: string | null;
    date_qualified: string | null;
    date_drafted: string | null;
    submitted_at: string | null;
    award_decision_at: string | null;
    award_outcome: AwardOutcome;
    amount_awarded_usd: number | null;
    internal_notes: string | null;
  };
}

export type ProvenanceType = "public_website" | "synthetic_demo" | "unverified";

export interface ProvenancedValue<T> {
  value: T;
  provenance: ProvenanceType;
  source_url: string | null;
}

export interface TechMomsProfile {
  schema_version: string;
  organization_id: string;
  demo_mode: boolean;
  as_of: string;
  provenance_policy: Record<ProvenanceType, string>;
  organization: {
    name: ProvenancedValue<string>;
    website: ProvenancedValue<string>;
    mission: ProvenancedValue<string>;
    first_cohorts: ProvenancedValue<string>;
    tax_exempt_501c3: ProvenancedValue<boolean>;
    headquarters_state: ProvenancedValue<string>;
    annual_operating_budget_usd: ProvenancedValue<number>;
    annual_revenue_usd: ProvenancedValue<number>;
    full_time_equivalent_staff: ProvenancedValue<number>;
    available_cash_match_usd: ProvenancedValue<number>;
    ein: ProvenancedValue<string | null>;
  };
  service_area: {
    states: ProvenancedValue<string[]>;
    delivery: ProvenancedValue<string[]>;
    locations: ProvenancedValue<string[]>;
    willing_to_expand_to_other_states: ProvenancedValue<boolean>;
  };
  populations: {
    primary: ProvenancedValue<string[]>;
    secondary: ProvenancedValue<string[]>;
    percent_low_income: ProvenancedValue<number>;
    percent_unemployed_or_underemployed: ProvenancedValue<number>;
    percent_rural: ProvenancedValue<number>;
    demographic_data_collection: ProvenancedValue<string>;
  };
  programs: Array<{
    id: string;
    name: string;
    description: ProvenancedValue<string>;
    topics: string[];
    annual_budget_usd: ProvenancedValue<number>;
    annual_participants: ProvenancedValue<number>;
  }>;
  outcomes: {
    alumni_total: ProvenancedValue<number>;
    pursued_additional_education_percent: ProvenancedValue<number>;
    accepted_new_position_percent: ProvenancedValue<number>;
    received_pay_increase_percent: ProvenancedValue<number>;
    report_period: ProvenancedValue<string>;
  };
  grant_preferences: {
    minimum_preferred_award_usd: ProvenancedValue<number>;
    maximum_application_effort_hours: ProvenancedValue<number>;
    government_grants_allowed: ProvenancedValue<boolean>;
    national_grants_allowed: ProvenancedValue<boolean>;
    requires_staff_review_before_application: boolean;
    search_topics: string[];
  };
  matching_policy: Record<string, string>;
}
