import type { GrantRecord } from "../src/types/grant.ts";

export const DEMO_GRANTS: GrantRecord[] = [
  {
    schema_version: "1.1",
    grant_id: "demo-utah-digital-workforce-2026",
    is_demo_data: true,
    demo_note:
      "Synthetic demo record for interface testing. Funder, amounts, and links are simulated.",
    name: "Utah Digital Opportunity & Workforce Access Grant (Demo)",
    funder: "Utah Workforce Innovation Office (Synthetic Funder)",
    official_url: "https://example.org/demo-grants/utah-digital-opportunity",
    application_url: "https://example.org/demo-grants/utah-digital-opportunity/apply",
    source_urls: [
      "https://example.org/demo-grants/utah-digital-opportunity/guidelines"
    ],
    last_verified_at: "2026-11-12",
    discovered_at: "2026-11-10",
    status: "open",
    cycle: {
      opens_on: "2026-10-01",
      deadline: "2026-12-18",
      recurrence: "annual",
      next_expected_open_on: "2027-10-01",
      letter_of_intent_deadline: null,
      decision_date: "2027-02-15",
      award_date: "2027-03-01",
      deadline_type: "hard_close",
      cycle_notes: "Single annual cycle for Utah-based adult digital workforce providers."
    },
    funding: {
      currency: "USD",
      minimum_award: 25000,
      maximum_award: 75000,
      typical_award: 50000,
      total_program_funding: 1200000,
      number_of_awards: 20,
      matching_funds_required: true,
      matching_percentage: 10,
      allowed_costs: [
        "Instructor salaries & cohort facilitation",
        "Participant tuition & childcare stipends",
        "Loaner laptops & software licenses",
        "Rural online cohort outreach"
      ],
      excluded_costs: ["Capital construction", "Endowment contributions", "Lobbying"],
      recommended_request_usd: 50000,
      recommendation_basis:
        "Matches typical award ($50k); requires $5,000 cash match (25% of Tech-Moms $20,000 available match) and supports 17% of Foundational + Digital Literacy budgets.",
      overhead_allowed: true,
      indirect_cost_rate_cap_percent: 10,
      overhead_restrictions: "Capped at 10% modified total direct costs.",
      expected_value_usd: null,
      expected_value_basis:
        "Win probability is uncalibrated without historical competition data."
    },
    scope: {
      geographic_level: "state",
      eligible_states: ["Utah"],
      eligible_counties: [],
      eligible_cities: ["Lehi", "Sandy", "St. George"],
      national: false,
      target_populations: [
        "unemployed or underemployed adults",
        "low-income households",
        "rural residents"
      ],
      topics: ["workforce development", "digital inclusion", "adult education"],
      eligible_program_types: ["Cohort training", "Digital literacy", "Career navigation"]
    },
    requirements: [
      {
        requirement: "Primary service delivery located within the State of Utah",
        mandatory: true,
        source_url: "https://example.org/demo-grants/utah-digital-opportunity/guidelines",
        source_quote_or_excerpt:
          "Applicants must deliver training cohorts to Utah residents across urban or rural counties.",
        techmoms_evidence:
          "Operates cohorts in Lehi, Sandy, St. George, Wasatch Front, and rural Utah online.",
        determination: "pass",
        reason: "Verified Utah headquarters and multi-site hybrid delivery."
      },
      {
        requirement: "Minimum 10% non-state cash match committed at application",
        mandatory: true,
        source_url: "https://example.org/demo-grants/utah-digital-opportunity/guidelines",
        source_quote_or_excerpt:
          "Grantees must document a 10% cash match relative to requested funds.",
        techmoms_evidence:
          "Profile indicates $20,000 available cash match (synthetic demo figure) covering a $50,000 request ($5,000 match).",
        determination: "pass",
        reason: "Available cash match exceeds the $5,000 requirement."
      },
      {
        requirement: "Demonstrated track record of at least 2 years delivering adult digital skills",
        mandatory: true,
        source_url: "https://example.org/demo-grants/utah-digital-opportunity/guidelines",
        source_quote_or_excerpt:
          "Eligible providers must show at least 24 months of adult digital skills instruction.",
        techmoms_evidence: "First cohorts launched September 2020; 957 alumni reported.",
        determination: "pass",
        reason: "Over 6 years of documented cohort delivery."
      }
    ],
    analysis: {
      eligibility_status: "eligible",
      mandatory_requirements_confirmed_percent: 100,
      strategic_fit_percent: 94,
      strategic_fit_rationale:
        "Strong alignment across Tech-Moms' core Utah workforce mission, 48% low-income and 62% unemployed/underemployed participant profile, and hybrid rural outreach.",
      competitiveness_band: "medium",
      competition_evidence: [
        "Statewide pool with ~20 awards across 1.2M total allocation.",
        "Open to community colleges and regional nonprofits."
      ],
      win_probability_percent: null,
      win_probability_method: null,
      priority_score: 92,
      matched_program_ids: ["foundational", "literacy"],
      strengths: [
        "Reported outcomes show 61% accepted a new position and 58% received a pay increase.",
        "Childcare support and tuition assistance directly address barrier-reduction criteria.",
        "Hybrid model reaches rural Utah residents without requiring new physical sites."
      ],
      risks: [
        "Verify IRS 501(c)(3) letter and EIN documentation prior to portal upload.",
        "Indirect cost cap at 10% requires clean budget allocation."
      ],
      missing_information_questions: [
        "Can finance confirm the current IRS EIN and upload the official 501(c)(3) determination letter?",
        "Which unrestricted reserve line item will be designated for the $5,000 cash match?"
      ],
      application_effort_hours_estimate: 28,
      recommended_action: "advance_to_draft",
      win_probability_evidence: [],
      expected_value_usd: null,
      expected_value_basis: null
    },
    dashboard: {
      category: "State Workforce",
      geographic_scope: "Utah (Statewide)",
      staff_status: "applying",
      dismissed_reason: null,
      staff_feedback: "Strong fit for Foundational + Digital Literacy spring cohorts.",
      is_new: false,
      last_change_detected_at: "2026-11-12"
    },
    data_quality: {
      verified_from_primary_source: false,
      confidence: "synthetic_demo",
      missing_fields: ["organization.ein"],
      notes: ["Synthetic demo record created to test dashboard workflows."]
    },
    application: {
      letter_of_intent_required: false,
      application_complexity: "medium",
      estimated_hours: 28,
      hours_estimate_basis:
        "8-page program narrative, 2-year outcome table, line-item budget, and match attestation.",
      required_attachments: [
        "IRS 501(c)(3) Determination Letter",
        "FY2025 Board-Approved Budget",
        "Outcome Metrics Summary",
        "Cash Match Commitment Letter"
      ],
      prerequisites: ["Active Utah state vendor registration"],
      submission_method: "State Grants Portal (Demo)",
      application_instructions_url:
        "https://example.org/demo-grants/utah-digital-opportunity/instructions"
    },
    workflow: {
      pipeline_stage: "qualified",
      assigned_owner: "Sarah Chen",
      date_qualified: "2026-11-11",
      date_drafted: null,
      submitted_at: null,
      award_decision_at: null,
      award_outcome: "pending",
      amount_awarded_usd: null,
      internal_notes:
        "Confirmed $5k cash match feasibility; awaiting final EIN confirmation from finance."
    }
  },
  {
    schema_version: "1.1",
    grant_id: "demo-mtn-west-women-reentry-2027",
    is_demo_data: true,
    demo_note:
      "Synthetic demo record for interface testing. Funder, amounts, and links are simulated.",
    name: "Mountain West Women in STEM Reentry Fellowship Grant (Demo)",
    funder: "Cascade & Wasatch Philanthropy Collaborative (Synthetic Funder)",
    official_url: "https://example.org/demo-grants/mountain-west-women-stem",
    application_url: "https://example.org/demo-grants/mountain-west-women-stem/apply",
    source_urls: [
      "https://example.org/demo-grants/mountain-west-women-stem/rfp"
    ],
    last_verified_at: "2026-11-13",
    discovered_at: "2026-11-05",
    status: "open",
    cycle: {
      opens_on: "2026-10-15",
      deadline: "2027-01-15",
      recurrence: "annual",
      next_expected_open_on: "2027-10-15",
      letter_of_intent_deadline: null,
      decision_date: "2027-03-20",
      award_date: "2027-04-01",
      deadline_type: "hard_close",
      cycle_notes: "Annual foundation RFP focused on women returning to STEM careers."
    },
    funding: {
      currency: "USD",
      minimum_award: 30000,
      maximum_award: 100000,
      typical_award: 75000,
      total_program_funding: 900000,
      number_of_awards: 12,
      matching_funds_required: false,
      matching_percentage: null,
      allowed_costs: [
        "Career Relaunch curriculum delivery",
        "Cohort coaching & alumni mentorship",
        "Participant stipends & childcare support",
        "Evaluation & outcome tracking"
      ],
      excluded_costs: ["Debt retirement", "For-profit ventures"],
      recommended_request_usd: 75000,
      recommendation_basis:
        "Targets typical $75,000 award size (~19% of combined Foundational + Career Relaunch budgets); no match required.",
      overhead_allowed: true,
      indirect_cost_rate_cap_percent: 15,
      overhead_restrictions: "Up to 15% general operating overhead allowed.",
      expected_value_usd: null,
      expected_value_basis: null
    },
    scope: {
      geographic_level: "regional",
      eligible_states: ["Utah", "Colorado", "Idaho", "Wyoming"],
      eligible_counties: [],
      eligible_cities: [],
      national: false,
      target_populations: ["adult women", "mothers", "career returners"],
      topics: ["women in technology", "career reentry", "economic mobility"],
      eligible_program_types: ["Career reentry", "Technical bootcamps", "Mentorship"]
    },
    requirements: [
      {
        requirement: "Program serves women re-entering the workforce in UT, CO, ID, or WY",
        mandatory: true,
        source_url: "https://example.org/demo-grants/mountain-west-women-stem/rfp",
        source_quote_or_excerpt:
          "Funded programs must operate in at least one Mountain West state (UT, CO, ID, WY) and center women returning to technical careers.",
        techmoms_evidence:
          "Headquartered in Utah; Career Relaunch & Foundational serve mothers and career returners across Utah.",
        determination: "pass",
        reason: "Meets both geographic footprint and primary demographic focus."
      },
      {
        requirement: "Tracks post-program employment placement and wage progression",
        mandatory: true,
        source_url: "https://example.org/demo-grants/mountain-west-women-stem/rfp",
        source_quote_or_excerpt:
          "Applicants must report job placement and compensation gains at 6+ months post-cohort.",
        techmoms_evidence:
          "September 2026 report tracks 61% new position acceptance and 58% pay increase across 957 alumni.",
        determination: "pass",
        reason: "Existing outcome metrics directly match evaluation rubric."
      }
    ],
    analysis: {
      eligibility_status: "eligible",
      mandatory_requirements_confirmed_percent: 100,
      strategic_fit_percent: 96,
      strategic_fit_rationale:
        "Direct mission match with Career Relaunch and Foundational Program; zero match burden and generous 15% overhead allowance.",
      competitiveness_band: "medium",
      competition_evidence: [
        "4-state regional pool with ~12 awards expected.",
        "Strong alignment with Tech-Moms' 957-alumni track record."
      ],
      win_probability_percent: null,
      win_probability_method: null,
      priority_score: 95,
      matched_program_ids: ["foundational", "relaunch"],
      strengths: [
        "100% of mandatory eligibility gates passed.",
        "No matching funds required; 15% indirect cost allowance.",
        "63% additional education + 61% placement metrics provide compelling evidence."
      ],
      risks: [
        "Funder asks for consent-based aggregate demographic methodology—attach current collection policy."
      ],
      missing_information_questions: [
        "Include updated September 2026 annual report PDF as an appendix?"
      ],
      application_effort_hours_estimate: 34,
      recommended_action: "prioritize_submission",
      win_probability_evidence: [],
      expected_value_usd: null,
      expected_value_basis: null
    },
    dashboard: {
      category: "Regional Foundation",
      geographic_scope: "Regional (UT, CO, ID, WY)",
      staff_status: "applying",
      dismissed_reason: null,
      staff_feedback: "Top Q1 priority; narrative draft 60% complete.",
      is_new: false,
      last_change_detected_at: "2026-11-13"
    },
    data_quality: {
      verified_from_primary_source: false,
      confidence: "synthetic_demo",
      missing_fields: [],
      notes: ["Synthetic demo record created to test dashboard workflows."]
    },
    application: {
      letter_of_intent_required: false,
      application_complexity: "medium",
      estimated_hours: 34,
      hours_estimate_basis:
        "Narrative proposal, alumni impact case study, and 12-month program budget.",
      required_attachments: [
        "Annual Impact Report (Sep 2026)",
        "Program Budget & Narrative",
        "Board Roster"
      ],
      prerequisites: ["Online foundation portal registration"],
      submission_method: "Philanthropy Portal (Demo)",
      application_instructions_url:
        "https://example.org/demo-grants/mountain-west-women-stem/guide"
    },
    workflow: {
      pipeline_stage: "drafted",
      assigned_owner: "Maya Patel",
      date_qualified: "2026-11-06",
      date_drafted: "2026-11-11",
      submitted_at: null,
      award_decision_at: null,
      award_outcome: "pending",
      amount_awarded_usd: null,
      internal_notes:
        "Drafting program outcomes section; scheduling leadership review for Jan 5."
    }
  },
  {
    schema_version: "1.1",
    grant_id: "demo-national-ai-cyber-upskilling-2027",
    is_demo_data: true,
    demo_note:
      "Synthetic demo record for interface testing. Funder, amounts, and links are simulated.",
    name: "National AI & Cybersecurity Upskilling Pathways Award (Demo)",
    funder: "Horizon Tech Workforce Alliance (Synthetic Funder)",
    official_url: "https://example.org/demo-grants/national-ai-cyber-pathways",
    application_url: "https://example.org/demo-grants/national-ai-cyber-pathways/apply",
    source_urls: [
      "https://example.org/demo-grants/national-ai-cyber-pathways/guidelines"
    ],
    last_verified_at: "2026-11-13",
    discovered_at: "2026-11-12",
    status: "open",
    cycle: {
      opens_on: "2026-11-01",
      deadline: "2027-02-01",
      recurrence: "annual",
      next_expected_open_on: "2027-11-01",
      letter_of_intent_deadline: "2026-12-10",
      decision_date: "2027-04-15",
      award_date: "2027-05-01",
      deadline_type: "loi_then_full",
      cycle_notes: "Requires Letter of Intent by Dec 10, 2026 before full proposal invite."
    },
    funding: {
      currency: "USD",
      minimum_award: 50000,
      maximum_award: 150000,
      typical_award: 100000,
      total_program_funding: 4000000,
      number_of_awards: 35,
      matching_funds_required: false,
      matching_percentage: null,
      allowed_costs: [
        "AI Foundations & Cybersecurity curriculum licensing",
        "Tech-Moms 2.0 alumni instructors",
        "Employer capstone coordination"
      ],
      excluded_costs: ["Hardware resale", "Capital expenses"],
      recommended_request_usd: 100000,
      recommendation_basis:
        "Supports scaling Tech-Moms 2.0 ($260k annual budget) across AI Foundations and Cybersecurity cohorts.",
      overhead_allowed: true,
      indirect_cost_rate_cap_percent: 12,
      overhead_restrictions: "12% indirect rate cap.",
      expected_value_usd: null,
      expected_value_basis: null
    },
    scope: {
      geographic_level: "national",
      eligible_states: [],
      eligible_counties: [],
      eligible_cities: [],
      national: true,
      target_populations: ["adult learners", "career changers", "women in tech"],
      topics: ["AI literacy", "cybersecurity training", "upskilling"],
      eligible_program_types: ["Advanced technical upskilling", "Industry credentials"]
    },
    requirements: [
      {
        requirement: "Active IRS 501(c)(3) tax-exempt status with verified EIN",
        mandatory: true,
        source_url: "https://example.org/demo-grants/national-ai-cyber-pathways/guidelines",
        source_quote_or_excerpt:
          "Lead applicant must provide a valid EIN and current IRS 501(c)(3) determination letter.",
        techmoms_evidence:
          "Profile lists tax_exempt_501c3 = true (unverified) and EIN = null (unverified).",
        determination: "unknown",
        reason:
          "Org profile flags 501(c)(3) status and EIN as unverified; cannot confirm pass without primary document."
      },
      {
        requirement: "Active curriculum covering AI Foundations or Cybersecurity pathways",
        mandatory: true,
        source_url: "https://example.org/demo-grants/national-ai-cyber-pathways/guidelines",
        source_quote_or_excerpt:
          "Funded projects must expand adult access to AI literacy, cybersecurity, or data analytics training.",
        techmoms_evidence:
          "Tech-Moms 2.0 delivers alumni training in AI Foundations, cybersecurity, data analytics, and project management.",
        determination: "pass",
        reason: "Direct program match with Tech-Moms 2.0."
      },
      {
        requirement: "Audited or CPA-reviewed financial statements for most recent fiscal year",
        mandatory: true,
        source_url: "https://example.org/demo-grants/national-ai-cyber-pathways/guidelines",
        source_quote_or_excerpt:
          "Organizations with budgets under $1M may submit CPA-reviewed financial statements.",
        techmoms_evidence:
          "Operating budget is $850,000 (synthetic demo); availability of CPA-reviewed FY2025 statements is not recorded.",
        determination: "unknown",
        reason: "Needs confirmation from Tech-Moms finance team."
      },
      {
        requirement: "Tracks participant progression into advanced education or tech roles",
        mandatory: false,
        source_url: "https://example.org/demo-grants/national-ai-cyber-pathways/guidelines",
        source_quote_or_excerpt:
          "Preference given to organizations tracking continuing education and placement outcomes.",
        techmoms_evidence: "63% pursued additional education; 61% accepted a new position.",
        determination: "pass",
        reason: "Strong quantitative evidence on preference criterion."
      }
    ],
    analysis: {
      eligibility_status: "needs_verification",
      mandatory_requirements_confirmed_percent: 33,
      strategic_fit_percent: 91,
      strategic_fit_rationale:
        "Tech-Moms 2.0 directly teaches AI Foundations and cybersecurity; high strategic fit once IRS EIN and CPA-reviewed financials are verified.",
      competitiveness_band: "high",
      competition_evidence: [
        "National RFP attracting large workforce intermediaries and universities.",
        "35 awards available nationwide across $4M pool."
      ],
      win_probability_percent: null,
      win_probability_method: null,
      priority_score: 84,
      matched_program_ids: ["advanced"],
      strengths: [
        "Existing Tech-Moms 2.0 alumni pipeline (100 annual participants) accelerates enrollment.",
        "LOI due Dec 10 lowers upfront risk before committing 44 hours to full proposal."
      ],
      risks: [
        "National competition is high; requires strong differentiation on women/mothers retention.",
        "Two mandatory compliance documents (EIN/501c3 letter, CPA review) unverified in profile."
      ],
      missing_information_questions: [
        "What is Tech-Moms' official IRS EIN and where is the 501(c)(3) letter stored?",
        "Does Tech-Moms have CPA-reviewed financial statements for FY2025?"
      ],
      application_effort_hours_estimate: 44,
      recommended_action: "verify_compliance_and_submit_loi",
      win_probability_evidence: [],
      expected_value_usd: null,
      expected_value_basis: null
    },
    dashboard: {
      category: "National Tech Workforce",
      geographic_scope: "National (US)",
      staff_status: "reviewing",
      dismissed_reason: null,
      staff_feedback: "Checking EIN & CPA review status before Dec 10 LOI.",
      is_new: true,
      last_change_detected_at: "2026-11-12"
    },
    data_quality: {
      verified_from_primary_source: false,
      confidence: "synthetic_demo",
      missing_fields: ["organization.ein", "organization.tax_exempt_501c3"],
      notes: ["LOI deadline Dec 10, 2026 requires prompt staff verification."]
    },
    application: {
      letter_of_intent_required: true,
      application_complexity: "high",
      estimated_hours: 44,
      hours_estimate_basis:
        "2-page LOI (8 hrs) + full national proposal, logic model, and evaluation plan (36 hrs).",
      required_attachments: [
        "IRS 501(c)(3) Determination Letter",
        "CPA-Reviewed Financial Statements",
        "Curriculum Syllabus (AI Foundations / Cybersecurity)",
        "2 Employer Endorsement Letters"
      ],
      prerequisites: ["Letter of Intent approval"],
      submission_method: "Online National Portal (Demo)",
      application_instructions_url:
        "https://example.org/demo-grants/national-ai-cyber-pathways/instructions"
    },
    workflow: {
      pipeline_stage: "research",
      assigned_owner: null,
      date_qualified: null,
      date_drafted: null,
      submitted_at: null,
      award_decision_at: null,
      award_outcome: "unknown",
      amount_awarded_usd: null,
      internal_notes: "Flagged for LOI eligibility verification with leadership."
    }
  },
  {
    schema_version: "1.1",
    grant_id: "demo-rural-utah-remote-tech-2026",
    is_demo_data: true,
    demo_note:
      "Synthetic demo record for interface testing. Funder, amounts, and links are simulated.",
    name: "Rural Utah Remote Tech Career Accelerator Grant (Demo)",
    funder: "Silverstone Rural Prosperity Foundation (Synthetic Funder)",
    official_url: "https://example.org/demo-grants/rural-utah-remote-tech",
    application_url: "https://example.org/demo-grants/rural-utah-remote-tech/apply",
    source_urls: [
      "https://example.org/demo-grants/rural-utah-remote-tech/criteria"
    ],
    last_verified_at: "2026-11-11",
    discovered_at: "2026-11-08",
    status: "open",
    cycle: {
      opens_on: "2026-09-15",
      deadline: "2026-12-05",
      recurrence: "biannual",
      next_expected_open_on: "2027-04-01",
      letter_of_intent_deadline: null,
      decision_date: "2027-01-20",
      award_date: "2027-02-01",
      deadline_type: "hard_close",
      cycle_notes: "Fall/Winter cycle closes Dec 5; Spring cycle expected April 2027."
    },
    funding: {
      currency: "USD",
      minimum_award: 15000,
      maximum_award: 40000,
      typical_award: 30000,
      total_program_funding: 450000,
      number_of_awards: 15,
      matching_funds_required: false,
      matching_percentage: null,
      allowed_costs: [
        "Online cohort instruction for rural counties",
        "Hotspot / broadband stipends for participants",
        "Remote career coaching"
      ],
      excluded_costs: ["Out-of-state travel", "Capital equipment >$5,000"],
      recommended_request_usd: 35000,
      recommendation_basis:
        "Funds dedicated rural online cohort expansion within Foundational & Career Relaunch.",
      overhead_allowed: true,
      indirect_cost_rate_cap_percent: 10,
      overhead_restrictions: "Up to 10% indirect administrative costs.",
      expected_value_usd: null,
      expected_value_basis: null
    },
    scope: {
      geographic_level: "state",
      eligible_states: ["Utah"],
      eligible_counties: ["Iron", "Washington", "Cache", "Carbon", "Uintah", "Sanpete"],
      eligible_cities: ["St. George"],
      national: false,
      target_populations: ["rural Utah residents", "career changers", "women"],
      topics: ["rural workforce", "job training", "technology workforce"],
      eligible_program_types: ["Remote workforce training", "Online career reentry"]
    },
    requirements: [
      {
        requirement: "Serves residents in designated rural Utah counties via in-person or synchronous online cohorts",
        mandatory: true,
        source_url: "https://example.org/demo-grants/rural-utah-remote-tech/criteria",
        source_quote_or_excerpt:
          "Grant funds must directly support learners residing in non-Wasatch Front rural Utah counties.",
        techmoms_evidence:
          "Tech-Moms serves St. George and rural Utah via online cohorts.",
        determination: "pass",
        reason: "Delivery model explicitly covers rural Utah."
      },
      {
        requirement: "At least 25% of funded project participants reside in qualifying rural counties",
        mandatory: true,
        source_url: "https://example.org/demo-grants/rural-utah-remote-tech/criteria",
        source_quote_or_excerpt:
          "Funded cohorts must commit to >=25% rural county enrollment or dedicate a rural-only track.",
        techmoms_evidence:
          "Current baseline profile reports 18% rural participation (synthetic demo metric).",
        determination: "unknown",
        reason:
          "Current 18% org-wide baseline is below 25%; requires staff confirmation to dedicate a >=25% rural cohort."
      },
      {
        requirement: "No matching funds required",
        mandatory: false,
        source_url: "https://example.org/demo-grants/rural-utah-remote-tech/criteria",
        source_quote_or_excerpt: "100% project funding available without cash match.",
        techmoms_evidence: "Meets budget flexibility preference.",
        determination: "pass",
        reason: "No match barrier."
      }
    ],
    analysis: {
      eligibility_status: "needs_verification",
      mandatory_requirements_confirmed_percent: 50,
      strategic_fit_percent: 85,
      strategic_fit_rationale:
        "Strong fit with Tech-Moms' St. George and rural Utah online delivery, pending confirmation of a 25%+ rural enrollment commitment for this funded track.",
      competitiveness_band: "low",
      competition_evidence: [
        "Targeted rural Utah focus limits applicant pool to providers with live remote infrastructure."
      ],
      win_probability_percent: null,
      win_probability_method: null,
      priority_score: 81,
      matched_program_ids: ["foundational", "relaunch"],
      strengths: [
        "Low application effort (20 hrs) and lower competition pool.",
        "Already operates in St. George and runs online synchronous cohorts."
      ],
      risks: [
        "Short runway before Dec 5 deadline.",
        "Requires explicit commitment to reach >=25% rural county enrollment in grant-funded seats."
      ],
      missing_information_questions: [
        "Can Tech-Moms commit to a dedicated rural Utah online cohort (or >=25% rural seats) to satisfy the grant threshold?"
      ],
      application_effort_hours_estimate: 20,
      recommended_action: "confirm_rural_target_and_apply",
      win_probability_evidence: [],
      expected_value_usd: null,
      expected_value_basis: null
    },
    dashboard: {
      category: "Rural Workforce",
      geographic_scope: "Rural Utah Counties",
      staff_status: "reviewing",
      dismissed_reason: null,
      staff_feedback: "Checking rural cohort recruitment pipeline with St. George lead.",
      is_new: true,
      last_change_detected_at: "2026-11-11"
    },
    data_quality: {
      verified_from_primary_source: false,
      confidence: "synthetic_demo",
      missing_fields: ["rural_cohort_target_confirmation"],
      notes: ["Synthetic demo record created to test verification gating."]
    },
    application: {
      letter_of_intent_required: false,
      application_complexity: "low",
      estimated_hours: 20,
      hours_estimate_basis: "Short 4-page online form + rural county outreach plan.",
      required_attachments: ["Rural Recruitment Plan", "Project Budget"],
      prerequisites: [],
      submission_method: "Foundation Web Form (Demo)",
      application_instructions_url:
        "https://example.org/demo-grants/rural-utah-remote-tech/form"
    },
    workflow: {
      pipeline_stage: "research",
      assigned_owner: "Elena Rostova",
      date_qualified: null,
      date_drafted: null,
      submitted_at: null,
      award_decision_at: null,
      award_outcome: "pending",
      amount_awarded_usd: null,
      internal_notes: "Confirming whether Spring online cohort can dedicate 30% rural seats."
    }
  },
  {
    schema_version: "1.1",
    grant_id: "demo-wasatch-family-digital-literacy-2026",
    is_demo_data: true,
    demo_note:
      "Synthetic demo record for interface testing. Funder, amounts, and links are simulated.",
    name: "Wasatch Front Family Digital Literacy & Childcare Fund (Demo)",
    funder: "Beehive Community Impact Fund (Synthetic Funder)",
    official_url: "https://example.org/demo-grants/wasatch-family-literacy",
    application_url: "https://example.org/demo-grants/wasatch-family-literacy/apply",
    source_urls: [
      "https://example.org/demo-grants/wasatch-family-literacy/guidelines"
    ],
    last_verified_at: "2026-11-08",
    discovered_at: "2026-10-18",
    status: "open",
    cycle: {
      opens_on: "2026-10-01",
      deadline: "2026-11-30",
      recurrence: "annual",
      next_expected_open_on: "2027-10-01",
      letter_of_intent_deadline: null,
      decision_date: "2027-01-10",
      award_date: "2027-01-25",
      deadline_type: "hard_close",
      cycle_notes: "Submitted ahead of Nov 30 deadline; awaiting January award notice."
    },
    funding: {
      currency: "USD",
      minimum_award: 10000,
      maximum_award: 30000,
      typical_award: 25000,
      total_program_funding: 300000,
      number_of_awards: 12,
      matching_funds_required: false,
      matching_percentage: null,
      allowed_costs: [
        "Family digital literacy workshops",
        "Childcare support during classes",
        "Bilingual learning materials"
      ],
      excluded_costs: ["Capital campaigns"],
      recommended_request_usd: 25000,
      recommendation_basis:
        "Supports 28% of the $90,000 Digital Literacy program budget plus childcare stipends.",
      overhead_allowed: true,
      indirect_cost_rate_cap_percent: 10,
      overhead_restrictions: "Up to 10% administrative overhead.",
      expected_value_usd: null,
      expected_value_basis: null
    },
    scope: {
      geographic_level: "local",
      eligible_states: ["Utah"],
      eligible_counties: ["Salt Lake", "Utah"],
      eligible_cities: ["Lehi", "Sandy"],
      national: false,
      target_populations: [
        "families in digital literacy classes",
        "mothers",
        "adults building digital literacy"
      ],
      topics: ["digital inclusion", "family education", "computer literacy"],
      eligible_program_types: ["Community digital literacy", "Family wraparound support"]
    },
    requirements: [
      {
        requirement: "Serves families in Salt Lake or Utah County",
        mandatory: true,
        source_url: "https://example.org/demo-grants/wasatch-family-literacy/guidelines",
        source_quote_or_excerpt:
          "Programs must host in-person classes in Salt Lake County or Utah County.",
        techmoms_evidence: "In-person hubs in Sandy (Salt Lake County) and Lehi (Utah County).",
        determination: "pass",
        reason: "Exact geographic match."
      },
      {
        requirement: "Includes family-inclusive or childcare wraparound component",
        mandatory: true,
        source_url: "https://example.org/demo-grants/wasatch-family-literacy/guidelines",
        source_quote_or_excerpt:
          "Eligible proposals remove caregiving barriers via childcare or parent-child classes.",
        techmoms_evidence:
          "Digital Literacy lets adults attend with school-aged children; Foundational offers childcare support.",
        determination: "pass",
        reason: "Directly aligned with program design."
      }
    ],
    analysis: {
      eligibility_status: "eligible",
      mandatory_requirements_confirmed_percent: 100,
      strategic_fit_percent: 89,
      strategic_fit_rationale:
        "Purpose-built fit for Tech-Moms Digital Literacy family model in Sandy and Lehi.",
      competitiveness_band: "low",
      competition_evidence: [
        "Localized Salt Lake / Utah County applicant pool with clear wraparound criterion."
      ],
      win_probability_percent: null,
      win_probability_method: null,
      priority_score: 86,
      matched_program_ids: ["literacy", "foundational"],
      strengths: [
        "Already submitted ahead of deadline with full local outcome data.",
        "Low 16-hour application burden."
      ],
      risks: ["Decision delayed until mid-January."],
      missing_information_questions: [],
      application_effort_hours_estimate: 16,
      recommended_action: "track_decision",
      win_probability_evidence: [],
      expected_value_usd: null,
      expected_value_basis: null
    },
    dashboard: {
      category: "Local Community",
      geographic_scope: "Wasatch Front, UT",
      staff_status: "submitted",
      dismissed_reason: null,
      staff_feedback: "Submitted Nov 8 by Sarah Chen.",
      is_new: false,
      last_change_detected_at: "2026-11-08"
    },
    data_quality: {
      verified_from_primary_source: false,
      confidence: "synthetic_demo",
      missing_fields: [],
      notes: ["Synthetic demo record representing Submitted stage."]
    },
    application: {
      letter_of_intent_required: false,
      application_complexity: "low",
      estimated_hours: 16,
      hours_estimate_basis: "Community foundation short form + workshop schedule.",
      required_attachments: ["Workshop Curriculum", "Line-Item Budget"],
      prerequisites: [],
      submission_method: "Community Portal (Demo)",
      application_instructions_url:
        "https://example.org/demo-grants/wasatch-family-literacy/guide"
    },
    workflow: {
      pipeline_stage: "submitted",
      assigned_owner: "Sarah Chen",
      date_qualified: "2026-10-22",
      date_drafted: "2026-11-01",
      submitted_at: "2026-11-08",
      award_decision_at: null,
      award_outcome: "pending",
      amount_awarded_usd: null,
      internal_notes: "Confirmation receipt saved in internal drive; decision expected Jan 10."
    }
  },
  {
    schema_version: "1.1",
    grant_id: "demo-silicon-slopes-talent-catalyst-2027",
    is_demo_data: true,
    demo_note:
      "Synthetic demo record for interface testing. Funder, amounts, and links are simulated.",
    name: "Silicon Slopes Community Tech Talent Catalyst (Demo)",
    funder: "Alpine Tech Sector Collaborative (Synthetic Funder)",
    official_url: "https://example.org/demo-grants/silicon-slopes-catalyst",
    application_url: "https://example.org/demo-grants/silicon-slopes-catalyst/apply",
    source_urls: [
      "https://example.org/demo-grants/silicon-slopes-catalyst/rfp"
    ],
    last_verified_at: "2026-11-13",
    discovered_at: "2026-11-09",
    status: "upcoming",
    cycle: {
      opens_on: "2027-01-05",
      deadline: "2027-03-01",
      recurrence: "annual",
      next_expected_open_on: "2027-01-05",
      letter_of_intent_deadline: null,
      decision_date: "2027-04-15",
      award_date: "2027-05-01",
      deadline_type: "hard_close",
      cycle_notes: "Opens Jan 5, 2027; advance preparation of 3 employer letters recommended."
    },
    funding: {
      currency: "USD",
      minimum_award: 15000,
      maximum_award: 50000,
      typical_award: 40000,
      total_program_funding: 600000,
      number_of_awards: 15,
      matching_funds_required: false,
      matching_percentage: null,
      allowed_costs: [
        "Data Analytics & Project Management instruction",
        "Employer networking showcases",
        "Career placement coaching"
      ],
      excluded_costs: ["General endowment", "Equipment >$2,500/unit"],
      recommended_request_usd: 40000,
      recommendation_basis:
        "Aligns with typical $40k award to fund Tech-Moms 2.0 Data Analytics and PM tracks.",
      overhead_allowed: true,
      indirect_cost_rate_cap_percent: 10,
      overhead_restrictions: "10% max overhead.",
      expected_value_usd: null,
      expected_value_basis: null
    },
    scope: {
      geographic_level: "state",
      eligible_states: ["Utah"],
      eligible_counties: [],
      eligible_cities: ["Lehi", "Sandy", "St. George"],
      national: false,
      target_populations: ["career changers", "adult women", "Utah workforce"],
      topics: ["data analytics", "project management", "technology workforce"],
      eligible_program_types: ["Employer-aligned training", "Career pathways"]
    },
    requirements: [
      {
        requirement: "Serves Utah adult learners transitioning into technology careers",
        mandatory: true,
        source_url: "https://example.org/demo-grants/silicon-slopes-catalyst/rfp",
        source_quote_or_excerpt:
          "Must demonstrate clear placement pathways into Utah technology employers.",
        techmoms_evidence: "61% of alumni accepted new positions; active Utah cohort network.",
        determination: "pass",
        reason: "Core mission and location match."
      },
      {
        requirement: "Letters of support from at least 3 Utah tech employer partners",
        mandatory: true,
        source_url: "https://example.org/demo-grants/silicon-slopes-catalyst/rfp",
        source_quote_or_excerpt:
          "Applications must include 3 signed employer advisory or hiring partner letters.",
        techmoms_evidence:
          "Partner network exists via networking events, but signed letters for 2027 cycle are not yet collected.",
        determination: "unknown",
        reason: "Requires collecting 3 signed partner letters before submission."
      }
    ],
    analysis: {
      eligibility_status: "needs_verification",
      mandatory_requirements_confirmed_percent: 50,
      strategic_fit_percent: 88,
      strategic_fit_rationale:
        "High local employer alignment for Tech-Moms 2.0 Data Analytics & Project Management; upcoming cycle gives ample time to secure partner letters.",
      competitiveness_band: "medium",
      competition_evidence: [
        "Open to Utah bootcamps and nonprofit training orgs; 15 awards projected."
      ],
      win_probability_percent: null,
      win_probability_method: null,
      priority_score: 82,
      matched_program_ids: ["advanced", "foundational"],
      strengths: [
        "Opens Jan 5—plenty of runway to secure 3 employer partner letters.",
        "Low estimated effort (22 hours)."
      ],
      risks: ["Requires formalizing 3 employer hiring/advisory letters prior to March 1."],
      missing_information_questions: [
        "Which 3 Utah employer partners can sign letters of support by February 15?"
      ],
      application_effort_hours_estimate: 22,
      recommended_action: "prepare_employer_letters",
      win_probability_evidence: [],
      expected_value_usd: null,
      expected_value_basis: null
    },
    dashboard: {
      category: "Tech Ecosystem",
      geographic_scope: "Utah (Statewide)",
      staff_status: "saved",
      dismissed_reason: null,
      staff_feedback: "Queued for January opening; Elena contacting advisory partners.",
      is_new: false,
      last_change_detected_at: "2026-11-13"
    },
    data_quality: {
      verified_from_primary_source: false,
      confidence: "synthetic_demo",
      missing_fields: ["employer_support_letters"],
      notes: ["Upcoming cycle opens Jan 5, 2027."]
    },
    application: {
      letter_of_intent_required: false,
      application_complexity: "low",
      estimated_hours: 22,
      hours_estimate_basis: "5-page application + 3 employer letters + budget.",
      required_attachments: [
        "3 Signed Employer Support Letters",
        "Curriculum Overview",
        "Program Budget"
      ],
      prerequisites: ["3 Employer partner commitments"],
      submission_method: "Collaborative Portal (Demo)",
      application_instructions_url:
        "https://example.org/demo-grants/silicon-slopes-catalyst/guide"
    },
    workflow: {
      pipeline_stage: "qualified",
      assigned_owner: "Elena Rostova",
      date_qualified: "2026-11-10",
      date_drafted: null,
      submitted_at: null,
      award_decision_at: null,
      award_outcome: "pending",
      amount_awarded_usd: null,
      internal_notes: "Drafting employer letter template ahead of Jan 5 launch."
    }
  },
  {
    schema_version: "1.1",
    grant_id: "demo-northstar-maternal-mobility-2026",
    is_demo_data: true,
    demo_note:
      "Synthetic demo record for interface testing. Funder, amounts, and links are simulated.",
    name: "Future of Work Maternal Economic Mobility Initiative (Demo)",
    funder: "Northstar Economic Opportunity Trust (Synthetic Funder)",
    official_url: "https://example.org/demo-grants/maternal-economic-mobility",
    application_url: "https://example.org/demo-grants/maternal-economic-mobility/apply",
    source_urls: [
      "https://example.org/demo-grants/maternal-economic-mobility/award-notice"
    ],
    last_verified_at: "2026-11-04",
    discovered_at: "2026-08-20",
    status: "closed",
    cycle: {
      opens_on: "2026-08-01",
      deadline: "2026-10-15",
      recurrence: "annual",
      next_expected_open_on: "2027-08-01",
      letter_of_intent_deadline: null,
      decision_date: "2026-11-04",
      award_date: "2026-11-15",
      deadline_type: "hard_close",
      cycle_notes: "2026 cycle completed; awarded $55,000 (synthetic demo outcome)."
    },
    funding: {
      currency: "USD",
      minimum_award: 40000,
      maximum_award: 80000,
      typical_award: 60000,
      total_program_funding: 1500000,
      number_of_awards: 25,
      matching_funds_required: false,
      matching_percentage: null,
      allowed_costs: [
        "Career reentry cohorts",
        "Childcare & tuition assistance",
        "Alumni career coaching"
      ],
      excluded_costs: ["Lobbying"],
      recommended_request_usd: 60000,
      recommendation_basis: "Requested $60,000; awarded $55,000 in 2026 cycle.",
      overhead_allowed: true,
      indirect_cost_rate_cap_percent: 15,
      overhead_restrictions: "15% unrestricted operating allocation.",
      expected_value_usd: null,
      expected_value_basis: null
    },
    scope: {
      geographic_level: "national",
      eligible_states: [],
      eligible_counties: [],
      eligible_cities: [],
      national: true,
      target_populations: ["mothers", "adult women", "career returners"],
      topics: ["women employment", "career pathways", "economic mobility"],
      eligible_program_types: ["Workforce reentry", "Wraparound support"]
    },
    requirements: [
      {
        requirement: "Primary beneficiaries include mothers or caregivers returning to workforce",
        mandatory: true,
        source_url: "https://example.org/demo-grants/maternal-economic-mobility/award-notice",
        source_quote_or_excerpt:
          "Priority funding for proven programs advancing maternal economic mobility.",
        techmoms_evidence: "Primary population includes mothers and career returners.",
        determination: "pass",
        reason: "Direct alignment."
      }
    ],
    analysis: {
      eligibility_status: "eligible",
      mandatory_requirements_confirmed_percent: 100,
      strategic_fit_percent: 92,
      strategic_fit_rationale: "Core alignment with Tech-Moms Foundational & Career Relaunch.",
      competitiveness_band: "high",
      competition_evidence: ["National grant with 25 awards across 400+ applicants."],
      win_probability_percent: null,
      win_probability_method: null,
      priority_score: 89,
      matched_program_ids: ["foundational", "relaunch"],
      strengths: ["Awarded $55,000 in 2026 demo cycle; eligible for renewal in Aug 2027."],
      risks: ["Must submit 6-month interim impact report to stay eligible for renewal."],
      missing_information_questions: [],
      application_effort_hours_estimate: 38,
      recommended_action: "steward_award",
      win_probability_evidence: [],
      expected_value_usd: null,
      expected_value_basis: null
    },
    dashboard: {
      category: "National Philanthropy",
      geographic_scope: "National (US)",
      staff_status: "submitted",
      dismissed_reason: null,
      staff_feedback: "Awarded $55k (demo); renewal opens Aug 2027.",
      is_new: false,
      last_change_detected_at: "2026-11-04"
    },
    data_quality: {
      verified_from_primary_source: false,
      confidence: "synthetic_demo",
      missing_fields: [],
      notes: ["Synthetic demo record illustrating terminal Award Decided stage."]
    },
    application: {
      letter_of_intent_required: false,
      application_complexity: "medium",
      estimated_hours: 38,
      hours_estimate_basis: "Full national foundation narrative + outcomes audit.",
      required_attachments: ["Impact Report", "Budget"],
      prerequisites: [],
      submission_method: "Trust Portal (Demo)",
      application_instructions_url: null
    },
    workflow: {
      pipeline_stage: "award_decided",
      assigned_owner: "Maya Patel",
      date_qualified: "2026-09-02",
      date_drafted: "2026-09-25",
      submitted_at: "2026-10-12",
      award_decision_at: "2026-11-04",
      award_outcome: "awarded",
      amount_awarded_usd: 55000,
      internal_notes: "Awarded $55,000 for 2027 Career Relaunch & Foundational seats."
    }
  },
  {
    schema_version: "1.1",
    grant_id: "demo-national-workforce-systems-lab-2027",
    is_demo_data: true,
    demo_note:
      "Synthetic demo record for interface testing. Funder, amounts, and links are simulated.",
    name: "National Adult Digital Workforce Demonstration Grant (Demo)",
    funder: "National Workforce Systems Lab (Synthetic Funder)",
    official_url: "https://example.org/demo-grants/workforce-systems-lab",
    application_url: "https://example.org/demo-grants/workforce-systems-lab/apply",
    source_urls: [
      "https://example.org/demo-grants/workforce-systems-lab/nofo"
    ],
    last_verified_at: "2026-11-12",
    discovered_at: "2026-11-11",
    status: "recurring_not_yet_open",
    cycle: {
      opens_on: null,
      deadline: "2027-04-10",
      recurrence: "annual",
      next_expected_open_on: "2027-01-20",
      letter_of_intent_deadline: "2027-02-20",
      decision_date: "2027-06-30",
      award_date: "2027-07-15",
      deadline_type: "estimated_recurring",
      cycle_notes: "Annual federal-style demonstration NOFO expected to open Jan 2027."
    },
    funding: {
      currency: "USD",
      minimum_award: 150000,
      maximum_award: 300000,
      typical_award: 200000,
      total_program_funding: 12000000,
      number_of_awards: 50,
      matching_funds_required: true,
      matching_percentage: 50,
      allowed_costs: [
        "Workforce training delivery",
        "Third-party evaluation partner",
        "Curriculum modernization"
      ],
      excluded_costs: ["Participant cash stipends without WIOA waiver"],
      recommended_request_usd: 150000,
      recommendation_basis:
        "Minimum award tier ($150k); however, 50% match ($75k) exceeds Tech-Moms' $20k cash match.",
      overhead_allowed: true,
      indirect_cost_rate_cap_percent: 10,
      overhead_restrictions: "10% de minimis rate without NICRA.",
      expected_value_usd: null,
      expected_value_basis: null
    },
    scope: {
      geographic_level: "national",
      eligible_states: [],
      eligible_counties: [],
      eligible_cities: [],
      national: true,
      target_populations: ["unemployed or underemployed adults", "adult learners"],
      topics: ["workforce development", "job training", "AI literacy"],
      eligible_program_types: ["Registered workforce partnerships", "Adult job training"]
    },
    requirements: [
      {
        requirement: "50% cash or documented third-party in-kind match required",
        mandatory: true,
        source_url: "https://example.org/demo-grants/workforce-systems-lab/nofo",
        source_quote_or_excerpt:
          "Lead applicants must secure 50% non-federal match ($75,000 minimum on $150,000 request).",
        techmoms_evidence:
          "Profile lists $20,000 available cash match (synthetic demo); $55,000 shortfall unless employer in-kind match is documented.",
        determination: "unknown",
        reason: "Available cash match ($20k) is insufficient without verifiable partner in-kind match."
      },
      {
        requirement: "Active UEI / SAM registration and verified 501(c)(3) status",
        mandatory: true,
        source_url: "https://example.org/demo-grants/workforce-systems-lab/nofo",
        source_quote_or_excerpt: "Valid SAM.gov UEI and IRS 501(c)(3) status required at submission.",
        techmoms_evidence: "EIN and 501(c)(3) status marked unverified; UEI status not recorded.",
        determination: "unknown",
        reason: "Requires federal registration and EIN verification."
      }
    ],
    analysis: {
      eligibility_status: "needs_verification",
      mandatory_requirements_confirmed_percent: 0,
      strategic_fit_percent: 78,
      strategic_fit_rationale:
        "Strong programmatic alignment, but large 50% match requirement and 72-hour effort estimate exceed Tech-Moms' 50-hour preference ceiling.",
      competitiveness_band: "high",
      competition_evidence: [
        "National federal-style NOFO typically sees 600+ submissions for 50 awards."
      ],
      win_probability_percent: null,
      win_probability_method: null,
      priority_score: 54,
      matched_program_ids: ["foundational", "advanced"],
      strengths: ["Large award size ($150k+) could transform annual capacity if partnered."],
      risks: [
        "Estimated 72 hours exceeds Tech-Moms' 50-hour maximum effort preference.",
        "Requires $75,000 match vs $20,000 available cash match."
      ],
      missing_information_questions: [
        "Could Tech-Moms apply as a sub-recipient under a Utah workforce board rather than lead applicant?",
        "Does Tech-Moms hold an active SAM.gov UEI?"
      ],
      application_effort_hours_estimate: 72,
      recommended_action: "consider_subrecipient_only",
      win_probability_evidence: [],
      expected_value_usd: null,
      expected_value_basis: null
    },
    dashboard: {
      category: "Federal-Style Demonstration",
      geographic_scope: "National (US)",
      staff_status: "new",
      dismissed_reason: null,
      staff_feedback: "Likely too heavy as prime applicant; evaluate as consortium partner.",
      is_new: true,
      last_change_detected_at: "2026-11-12"
    },
    data_quality: {
      verified_from_primary_source: false,
      confidence: "synthetic_demo",
      missing_fields: ["organization.ein", "sam_uei", "in_kind_match_commitments"],
      notes: ["Tests effort-cap and cash-match constraint flagging."]
    },
    application: {
      letter_of_intent_required: true,
      application_complexity: "high",
      estimated_hours: 72,
      hours_estimate_basis:
        "25-page federal-style technical narrative, logic model, SF-424 forms, and match MOUs.",
      required_attachments: [
        "SF-424 Budget Narrative",
        "Match Commitment MOUs",
        "IRS 501(c)(3) Letter",
        "Indirect Cost Agreement"
      ],
      prerequisites: ["SAM.gov UEI", "Grants.gov registration"],
      submission_method: "Federal-Style Portal (Demo)",
      application_instructions_url: null
    },
    workflow: {
      pipeline_stage: "research",
      assigned_owner: null,
      date_qualified: null,
      date_drafted: null,
      submitted_at: null,
      award_decision_at: null,
      award_outcome: "unknown",
      amount_awarded_usd: null,
      internal_notes: "Review whether Utah state partner wants Tech-Moms as sub-awardee."
    }
  },
  {
    schema_version: "1.1",
    grant_id: "demo-great-lakes-coding-access-2027",
    is_demo_data: true,
    demo_note:
      "Synthetic demo record for interface testing. Demonstrates hard-gate geographic ineligibility.",
    name: "Midwest & Great Lakes Coding Access Expansion Grant (Demo)",
    funder: "Great Lakes Civic Tech Endowment (Synthetic Funder)",
    official_url: "https://example.org/demo-grants/great-lakes-coding-access",
    application_url: null,
    source_urls: [
      "https://example.org/demo-grants/great-lakes-coding-access/rules"
    ],
    last_verified_at: "2026-11-10",
    discovered_at: "2026-11-10",
    status: "open",
    cycle: {
      opens_on: "2026-10-20",
      deadline: "2027-01-30",
      recurrence: "annual",
      next_expected_open_on: "2027-10-20",
      letter_of_intent_deadline: null,
      decision_date: "2027-03-15",
      award_date: "2027-04-01",
      deadline_type: "hard_close",
      cycle_notes: "Restricted exclusively to IL, MI, OH, and WI."
    },
    funding: {
      currency: "USD",
      minimum_award: 25000,
      maximum_award: 60000,
      typical_award: 45000,
      total_program_funding: 750000,
      number_of_awards: 16,
      matching_funds_required: false,
      matching_percentage: null,
      allowed_costs: ["Coding instruction", "Career placement"],
      excluded_costs: ["Out-of-region cohorts"],
      recommended_request_usd: null,
      recommendation_basis:
        "Excluded from recommended funding total because mandatory geographic eligibility failed.",
      overhead_allowed: true,
      indirect_cost_rate_cap_percent: 12,
      overhead_restrictions: null,
      expected_value_usd: null,
      expected_value_basis: null
    },
    scope: {
      geographic_level: "regional",
      eligible_states: ["Illinois", "Michigan", "Ohio", "Wisconsin"],
      eligible_counties: [],
      eligible_cities: [],
      national: false,
      target_populations: ["adult career changers", "underrepresented groups in tech"],
      topics: ["STEM education", "adult education", "digital skills"],
      eligible_program_types: ["Coding bootcamps", "Adult digital skills"]
    },
    requirements: [
      {
        requirement: "Service delivery and headquarters or active cohorts in IL, MI, OH, or WI",
        mandatory: true,
        source_url: "https://example.org/demo-grants/great-lakes-coding-access/rules",
        source_quote_or_excerpt:
          "Only organizations actively serving residents of Illinois, Michigan, Ohio, or Wisconsin are eligible.",
        techmoms_evidence:
          "Tech-Moms serves Utah only and profile specifies willing_to_expand_to_other_states = false.",
        determination: "fail",
        reason:
          "Hard geographic gate failed: Utah is outside the eligible Great Lakes states."
      },
      {
        requirement: "Introductory web development & digital skills training track",
        mandatory: true,
        source_url: "https://example.org/demo-grants/great-lakes-coding-access/rules",
        source_quote_or_excerpt:
          "Programs must cover foundational web technologies or software literacy.",
        techmoms_evidence: "Foundational Program teaches HTML, CSS, and JavaScript.",
        determination: "pass",
        reason: "Curriculum matches, but cannot override mandatory geographic failure."
      }
    ],
    analysis: {
      eligibility_status: "ineligible",
      mandatory_requirements_confirmed_percent: 50,
      strategic_fit_percent: 64,
      strategic_fit_rationale:
        "Strong thematic alignment with Foundational Program, but blocked by hard geographic restriction to Great Lakes states.",
      competitiveness_band: "medium",
      competition_evidence: ["Regional Great Lakes pool."],
      win_probability_percent: null,
      win_probability_method: null,
      priority_score: 22,
      matched_program_ids: ["foundational"],
      strengths: ["Curriculum aligns cleanly if Tech-Moms ever licensed content regionally."],
      risks: [
        "Hard eligibility gate failed (Utah only; willing_to_expand_to_other_states is false)."
      ],
      missing_information_questions: [],
      application_effort_hours_estimate: 25,
      recommended_action: "do_not_pursue",
      win_probability_evidence: [],
      expected_value_usd: null,
      expected_value_basis: null
    },
    dashboard: {
      category: "Out-of-Region Demo",
      geographic_scope: "Regional (IL, MI, OH, WI)",
      staff_status: "new",
      dismissed_reason: null,
      staff_feedback:
        "Kept visible in Research to demonstrate hard-gate geographic ineligibility.",
      is_new: false,
      last_change_detected_at: "2026-11-10"
    },
    data_quality: {
      verified_from_primary_source: false,
      confidence: "synthetic_demo",
      missing_fields: [],
      notes: ["Demonstrates policy: never infer eligibility pass from mission similarity."]
    },
    application: {
      letter_of_intent_required: false,
      application_complexity: "medium",
      estimated_hours: 25,
      hours_estimate_basis: "Standard regional foundation application.",
      required_attachments: ["Regional Operations Proof"],
      prerequisites: ["Active Great Lakes program site"],
      submission_method: "Endowment Portal (Demo)",
      application_instructions_url: null
    },
    workflow: {
      pipeline_stage: "research",
      assigned_owner: null,
      date_qualified: null,
      date_drafted: null,
      submitted_at: null,
      award_decision_at: null,
      award_outcome: "unknown",
      amount_awarded_usd: null,
      internal_notes: "Ineligible due to geographic restriction; ready to dismiss."
    }
  }
];
