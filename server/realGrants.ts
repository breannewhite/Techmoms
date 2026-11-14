import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { explainSearchError, fetchPage, getLastCompleteDiscoveryJob } from "./discovery.ts";
import { createGeminiClient, GEMINI_ANALYSIS_MODEL } from "./gemini.ts";
import { DEMO_ASSUMPTION_NOTE } from "../src/types/grant.ts";
import type {
  ApplicationComplexity,
  CompetitivenessBand,
  EligibilityStatus,
  EvaluationJob,
  GrantCandidate,
  GrantRecord,
  GrantRequirement,
  GrantStatus,
  RequirementDetermination,
  TechMomsProfile,
} from "../src/types/grant.ts";

// ---------------------------------------------------------------------------
// Store: real grants built from the last discovery run, saved to disk so staff
// edits (stage, owner, notes) and Gemini evaluations survive restarts.
// ---------------------------------------------------------------------------

interface RealStore {
  source_job_id: string;
  grants: GrantRecord[];
}

const STORE_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "data",
  "grants-real.json"
);

let store: RealStore | null = loadStore();

function loadStore(): RealStore | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8")) as RealStore;
    return Array.isArray(parsed.grants) ? parsed : null;
  } catch {
    return null;
  }
}

function saveStore(): void {
  if (!store) return;
  try {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
  } catch {
    // Read-only hosts can't save; the in-memory copy still works for this session.
  }
}

const isEnriched = (g: GrantRecord) => g.data_quality.confidence === "page_read_by_gemini";

const hasStaffEdits = (g: GrantRecord) =>
  g.workflow.pipeline_stage !== "research" ||
  g.workflow.assigned_owner !== null ||
  g.workflow.internal_notes !== null ||
  g.dashboard.staff_status !== "new";

/** Real grants for the dashboard. Rebuilds from the latest discovery run when it changes. */
export function getRealGrants(): GrantRecord[] {
  const job = getLastCompleteDiscoveryJob();
  if (!job) return store?.grants ?? [];
  if (store && store.source_job_id === job.job_id) return store.grants;

  const verifiedOn = (job.finished_at ?? job.started_at).slice(0, 10);
  const existing = new Map((store?.grants ?? []).map((g) => [g.grant_id, g]));
  const next: GrantRecord[] = [];
  const seen = new Set<string>();

  for (const candidate of job.candidates) {
    const base = buildBaseRecord(candidate, verifiedOn);
    seen.add(base.grant_id);
    next.push(existing.get(base.grant_id) ?? base);
  }
  // Keep older grants a person has already worked on, even if this run did not find them again.
  for (const old of existing.values()) {
    if (!seen.has(old.grant_id) && hasStaffEdits(old)) next.push(old);
  }

  store = { source_job_id: job.job_id, grants: next };
  saveStore();
  return store.grants;
}

export function replaceRealGrant(updated: GrantRecord): void {
  if (!store) return;
  store.grants = store.grants.map((g) => (g.grant_id === updated.grant_id ? updated : g));
  saveStore();
}

/** Clears staff edits (stage, owner, notes, status) but keeps the discovered and evaluated details. */
export function resetRealWorkflow(): GrantRecord[] {
  const grants = getRealGrants();
  if (!store) return grants;
  store.grants = store.grants.map((g) => ({
    ...g,
    dashboard: { ...g.dashboard, staff_status: "new", dismissed_reason: null, staff_feedback: null },
    workflow: {
      ...g.workflow,
      pipeline_stage: "research",
      assigned_owner: null,
      internal_notes: null,
      date_qualified: null,
      date_drafted: null,
      submitted_at: null,
      award_decision_at: null,
      award_outcome: "unknown",
      amount_awarded_usd: null,
    },
  }));
  saveStore();
  return store.grants;
}

// ---------------------------------------------------------------------------
// Base record: everything we can fill without another AI call
// ---------------------------------------------------------------------------

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Earliest future calendar date mentioned in the text ("December 15, 2026"), else null. */
export function parseFutureDeadline(text: string | null): string | null {
  if (!text) return null;
  const today = todayIso();
  const found: string[] = [];
  const pattern = /\b(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d{2})\b/gi;
  for (const m of text.matchAll(pattern)) {
    const month = MONTHS[m[1].toLowerCase()];
    const day = Number(m[2]);
    if (!month || day < 1 || day > 31) continue;
    found.push(`${m[3]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  }
  const future = found.filter((d) => d >= today).sort();
  return future[0] ?? null;
}

function toDollars(raw: string, unit: string | undefined): number | null {
  const n = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  const u = (unit ?? "").toLowerCase();
  const value = u.startsWith("m") ? n * 1_000_000 : u === "k" ? n * 1_000 : n;
  return Math.round(value);
}

/** Conservative award parser: handles "up to $X", "$X to $Y", "minimum $X". Otherwise returns nulls. */
export function parseAwardRange(text: string | null): { min: number | null; max: number | null } {
  if (!text) return { min: null, max: null };
  const money = "\\$\\s?([\\d][\\d,]*(?:\\.\\d+)?)\\s?(million|m|k)?\\b";
  const range = new RegExp(`${money}\\s*(?:to|-|–|—|and)\\s*\\$?\\s?([\\d][\\d,]*(?:\\.\\d+)?)\\s?(million|m|k)?`, "i").exec(text);
  if (range) {
    const unitB = range[4] ?? range[2];
    const a = toDollars(range[1], range[2] ?? unitB);
    const b = toDollars(range[3], unitB);
    if (a !== null && b !== null) return { min: Math.min(a, b), max: Math.max(a, b) };
  }
  const upTo = new RegExp(`(?:up to|maximum(?: grant| award)?(?: amount)?(?: of)?|ceiling(?: of)?)\\s*(?:is\\s*)?${money}`, "i").exec(text);
  if (upTo) return { min: null, max: toDollars(upTo[1], upTo[2]) };
  const minimum = new RegExp(`(?:minimum(?: grant| award)?(?: size| amount)?(?: is| of)?|at least|from)\\s*${money}`, "i").exec(text);
  if (minimum) return { min: toDollars(minimum[1], minimum[2]), max: null };
  return { min: null, max: null };
}

function categoryFor(candidate: GrantCandidate): string {
  const host = safeHost(candidate.official_url);
  if (host.endsWith(".gov") || host.endsWith(".us")) return "Government";
  if (/foundation|fund\b|trust/i.test(candidate.funder)) return "Foundation";
  return "Corporate / Other";
}

function geographyFor(candidate: GrantCandidate): string {
  const host = safeHost(candidate.official_url);
  const text = `${candidate.name} ${candidate.funder} ${candidate.deadline_text ?? ""}`;
  if (/utah/i.test(text) || host.endsWith("utah.gov")) return "Utah";
  if (host.endsWith(".gov") || /U\.S\.|federal|national/i.test(candidate.funder)) return "National";
  return "Not specified";
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function statusFor(candidate: GrantCandidate): GrantStatus {
  return candidate.status_hint === "unknown" ? "needs_verification" : candidate.status_hint;
}

export function buildBaseRecord(candidate: GrantCandidate, verifiedOn: string): GrantRecord {
  const deadline = parseFutureDeadline(candidate.deadline_text);
  const award = parseAwardRange(candidate.award_text);
  const verification = candidate.verification;

  const risks: string[] = [];
  if (verification === "unreachable") {
    risks.push("The funder link could not be opened. Confirm the program still exists before spending time on it.");
  } else if (verification === "page_blocked") {
    risks.push("The funder's site blocked our automatic check. Open the link and confirm the details by hand.");
  } else if (verification === "page_name_not_found") {
    risks.push("The linked page did not name this grant. Confirm the link points to the right program.");
  }

  const missing: string[] = [];
  if (!deadline) missing.push("cycle.deadline");
  if (award.min === null && award.max === null) missing.push("funding.award_range");

  return {
    schema_version: "1.1",
    grant_id: `real-${candidate.candidate_id}`,
    is_demo_data: false,
    demo_note: "",
    name: candidate.name,
    funder: candidate.funder,
    official_url: candidate.official_url,
    application_url: null,
    source_urls: [candidate.official_url],
    last_verified_at: verifiedOn,
    discovered_at: candidate.discovered_at,
    status: statusFor(candidate),
    cycle: {
      opens_on: null,
      deadline,
      recurrence: "unknown",
      next_expected_open_on: null,
      letter_of_intent_deadline: null,
      decision_date: null,
      award_date: null,
      deadline_type: "unknown",
      cycle_notes: candidate.deadline_text,
    },
    funding: {
      currency: "USD",
      minimum_award: award.min,
      maximum_award: award.max,
      typical_award: null,
      total_program_funding: null,
      number_of_awards: null,
      matching_funds_required: null,
      matching_percentage: null,
      allowed_costs: [],
      excluded_costs: [],
      recommended_request_usd: null,
      recommendation_basis: candidate.award_text
        ? `Funder page says: ${candidate.award_text}`
        : "Award amount not found yet.",
      overhead_allowed: null,
      indirect_cost_rate_cap_percent: null,
      overhead_restrictions: null,
      expected_value_usd: null,
      expected_value_basis: null,
    },
    scope: {
      geographic_level: null,
      eligible_states: [],
      eligible_counties: [],
      eligible_cities: [],
      national: null,
      target_populations: [],
      topics: candidate.matched_topics,
      eligible_program_types: [],
    },
    requirements: [],
    analysis: {
      eligibility_status: "needs_verification",
      mandatory_requirements_confirmed_percent: null,
      strategic_fit_percent: null,
      strategic_fit_rationale: candidate.why_relevant || null,
      competitiveness_band: "unknown",
      competition_evidence: [],
      win_probability_percent: null,
      win_probability_method: null,
      priority_score: null,
      matched_program_ids: [],
      strengths: [],
      risks,
      missing_information_questions: [
        "Is Tech-Moms eligible? Read the funder's guidelines and confirm.",
        "What is the current deadline and award size?",
      ],
      application_effort_hours_estimate: null,
      recommended_action: "verify_eligibility",
      win_probability_evidence: [],
      expected_value_usd: null,
      expected_value_basis: null,
    },
    dashboard: {
      category: categoryFor(candidate),
      geographic_scope: geographyFor(candidate),
      staff_status: "new",
      dismissed_reason: null,
      staff_feedback: null,
      is_new: true,
      last_change_detected_at: null,
    },
    data_quality: {
      verified_from_primary_source: verification === "page_confirmed",
      confidence: "search_summary",
      missing_fields: missing,
      notes: [
        candidate.verification_note,
        "Found by Gemini web search. Details are a summary and not yet evaluated; confirm on the funder's site.",
      ],
    },
    application: {
      letter_of_intent_required: null,
      application_complexity: "unknown",
      estimated_hours: null,
      hours_estimate_basis: null,
      required_attachments: [],
      prerequisites: [],
      submission_method: null,
      application_instructions_url: null,
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
      internal_notes: null,
    },
  };
}

// ---------------------------------------------------------------------------
// Gemini evaluation: read each official page and fill in the details
// ---------------------------------------------------------------------------

const BATCH_SIZE = 3;
const PAGE_CHARS_PER_GRANT = 9000;
const MIN_PAGE_CHARS = 400;
const FETCH_CONCURRENCY = 6;
const PROGRAM_IDS = ["foundational", "advanced", "relaunch", "literacy"] as const;
const MAX_RECOMMENDED_ASK_USD = 250_000;

let evaluation: EvaluationJob = {
  status: "idle",
  progress: { done: 0, total: 0, message: "" },
  error: null,
  started_at: null,
  finished_at: null,
};

export function getEvaluationJob(): EvaluationJob {
  return evaluation;
}

export function startEvaluation(profile: TechMomsProfile): EvaluationJob {
  if (evaluation.status === "running") return evaluation;
  evaluation = {
    status: "running",
    progress: { done: 0, total: 0, message: "Reading funder pages…" },
    error: null,
    started_at: new Date().toISOString(),
    finished_at: null,
  };
  runEvaluation(profile).catch((error) => {
    evaluation.status = "failed";
    evaluation.error = explainSearchError(error instanceof Error ? error.message : String(error));
    evaluation.finished_at = new Date().toISOString();
  });
  return evaluation;
}

/** Short fingerprint of the profile, so grants are re-evaluated when the profile or assumptions change. */
function profileFingerprint(profile: TechMomsProfile): string {
  return crypto.createHash("sha1").update(JSON.stringify(profile)).digest("hex").slice(0, 10);
}

/** Starts from a fresh base record (so old evaluation text does not pile up), keeping staff edits. */
function rebase(grant: GrantRecord): GrantRecord {
  const job = getLastCompleteDiscoveryJob();
  const candidate = job?.candidates.find((c) => `real-${c.candidate_id}` === grant.grant_id);
  if (!job || !candidate) return grant;
  const fresh = buildBaseRecord(candidate, (job.finished_at ?? job.started_at).slice(0, 10));
  return {
    ...fresh,
    workflow: grant.workflow,
    dashboard: {
      ...fresh.dashboard,
      staff_status: grant.dashboard.staff_status,
      dismissed_reason: grant.dashboard.dismissed_reason,
      staff_feedback: grant.dashboard.staff_feedback,
      is_new: grant.dashboard.is_new,
      last_change_detected_at: grant.dashboard.last_change_detected_at,
    },
  };
}

async function runEvaluation(profile: TechMomsProfile): Promise<void> {
  const fingerprint = profileFingerprint(profile);
  const todo = getRealGrants().filter(
    (g) => g.official_url && !(isEnriched(g) && g.data_quality.evaluated_with_profile === fingerprint)
  );
  evaluation.progress = { done: 0, total: todo.length, message: `Reading ${todo.length} funder pages…` };

  // 1. Fetch pages (free, no AI). Pages that block us or are PDFs are skipped.
  const pages: Array<{ grant: GrantRecord; text: string; lower: string }> = [];
  let fetched = 0;
  await pool(todo, FETCH_CONCURRENCY, async (grant) => {
    try {
      const page = await fetchPage(grant.official_url as string);
      if (page.kind === "html" && page.rawText.length >= MIN_PAGE_CHARS) {
        pages.push({ grant, text: page.rawText.slice(0, PAGE_CHARS_PER_GRANT), lower: page.text });
      }
    } catch {
      // Blocked or broken pages keep their search-summary record.
    }
    fetched += 1;
    evaluation.progress.message = `Read ${fetched} of ${todo.length} funder pages…`;
  });

  if (pages.length === 0) {
    evaluation.status = "complete";
    evaluation.finished_at = new Date().toISOString();
    evaluation.progress.message = "None of the funder pages could be read automatically.";
    return;
  }

  // 2. Ask Gemini (no web search needed) to evaluate each page, a few grants per call.
  const batches = chunk(pages, BATCH_SIZE);
  evaluation.progress = { done: 0, total: pages.length, message: `Evaluating ${pages.length} grants with Gemini…` };
  let applied = 0;

  for (const batch of batches) {
    let results: Record<string, unknown>[];
    try {
      results = await askGemini(profile, batch);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/per day|PerDay|429|RESOURCE_EXHAUSTED|API key|PERMISSION_DENIED/i.test(message)) throw error;
      continue; // a malformed batch is skipped; the rest still run
    }
    for (const item of batch) {
      const ev = results.find((r) => r.candidate_id === item.grant.grant_id);
      if (!ev) continue;
      replaceRealGrant(applyEvaluation(rebase(item.grant), ev, item.lower, fingerprint));
      applied += 1;
    }
    evaluation.progress = {
      done: Math.min(pages.length, evaluation.progress.done + batch.length),
      total: pages.length,
      message: `Evaluated ${applied} of ${pages.length} grants…`,
    };
  }

  evaluation.status = "complete";
  evaluation.finished_at = new Date().toISOString();
  evaluation.progress.message = `Evaluated ${applied} grants with Gemini. Each still needs staff review.`;
}

function buildEvaluationPrompt(
  profile: TechMomsProfile,
  batch: Array<{ grant: GrantRecord; text: string }>
): string {
  const org = profile.organization;
  const programs = profile.programs.map((p, i) => `${PROGRAM_IDS[i] ?? p.id}: ${p.name}`).join("; ");
  const pageBlocks = batch
    .map(
      ({ grant, text }) =>
        `=== GRANT candidate_id=${grant.grant_id} ===\nName: ${grant.name}\nFunder: ${grant.funder}\nPAGE TEXT (from ${grant.official_url}):\n${text}\n=== END GRANT ===`
    )
    .join("\n\n");

  return `You are a careful grant analyst for a nonprofit. Today is ${todayIso()}.
Evaluate each grant below using ONLY the page text provided. Never invent facts. Use null or "unknown" when the page does not say.

ORGANIZATION (reported facts; financial figures and tax status are NOT verified)
- ${org.name.value}: ${org.mission.value}
- Based in ${profile.service_area.states.value.join(", ")} (${profile.service_area.locations.value.join(", ")}); serves ${profile.populations.primary.value.join(", ")}
- Programs (id: name): ${programs}

DEMO ASSUMPTIONS about the organization (invented for a hackathon demo, not verified):
${(profile.demo_assumptions ?? []).map((a) => `- ${a.statement}`).join("\n") || "- (none)"}
Treat these as true when judging requirements about the organization itself. When a "pass" depends on one, start techmoms_evidence with "Assumption:". Never make assumptions about the GRANT's own rules: if the page does not state a requirement, do not invent one.

${pageBlocks}

Return ONLY JSON: {"grants":[ ... one object per grant ... ]}. Each object:
{
 "candidate_id": string (copy exactly),
 "deadline_iso": "YYYY-MM-DD" | null (next application deadline on or after today),
 "opens_on_iso": "YYYY-MM-DD" | null,
 "recurrence": string (e.g. "annual", "rolling", "one-time", "unknown"),
 "award_min_usd": number | null, "award_max_usd": number | null, "number_of_awards": number | null,
 "matching_required": boolean | null,
 "eligibility_status": "eligible" | "ineligible" | "needs_verification" | "unknown" (use "eligible" only if the page states the eligibility rules clearly and every mandatory requirement is "pass"; use "ineligible" if any mandatory requirement is "fail"; use "needs_verification" if the rules are unclear or incomplete),
 "requirements": [ up to 6 of {"requirement": string, "mandatory": boolean, "source_quote": string | null (an exact short quote from the page text, max 200 chars), "techmoms_evidence": string | null, "determination": "pass" | "fail" | "unknown", "reason": string} ],
 "fit_percent": number 0-100 (how well the grant matches the organization's mission and programs),
 "fit_rationale": string (1-2 sentences),
 "strengths": [up to 3 strings], "risks": [up to 3 strings], "missing_information_questions": [up to 3 strings],
 "matched_program_ids": [subset of ${JSON.stringify(PROGRAM_IDS)}],
 "topics": [up to 5 short strings],
 "geographic_scope": string (e.g. "Utah", "National", "Salt Lake County"),
 "eligible_states": [state names] (empty if national or unknown),
 "application_complexity": "low" | "medium" | "high" | "unknown",
 "estimated_hours": number | null,
 "required_attachments": [strings], "submission_method": string | null,
 "letter_of_intent_required": boolean | null,
 "category": string (short, e.g. "State Workforce", "Corporate Giving", "Federal Workforce")
}
Mark "determination" as "pass" only when the organization facts or the demo assumptions above clearly support it; "fail" when they clearly contradict it; otherwise "unknown". Do not guess.`;
}

async function askGemini(
  profile: TechMomsProfile,
  batch: Array<{ grant: GrantRecord; text: string }>
): Promise<Record<string, unknown>[]> {
  const ai = createGeminiClient();
  const response = await ai.models.generateContent({
    model: GEMINI_ANALYSIS_MODEL,
    contents: buildEvaluationPrompt(profile, batch),
    config: { responseMimeType: "application/json", temperature: 0.1, maxOutputTokens: 12000 },
  });
  const parsed = JSON.parse(response.text ?? "{}") as { grants?: unknown };
  return Array.isArray(parsed.grants) ? (parsed.grants as Record<string, unknown>[]) : [];
}

// ---- turning Gemini's answer into a safe record ---------------------------

const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

const text = (v: unknown, max = 400): string | null =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);

const strings = (v: unknown, limit: number, max = 300): string[] =>
  Array.isArray(v) ? v.map((s) => text(s, max)).filter((s): s is string => s !== null).slice(0, limit) : [];

const isoDate = (v: unknown): string | null =>
  typeof v === "string" && /^20\d{2}-\d{2}-\d{2}$/.test(v) ? v : null;

function applyEvaluation(
  grant: GrantRecord,
  ev: Record<string, unknown>,
  pageLower: string,
  fingerprint: string
): GrantRecord {
  const eligibility: EligibilityStatus = oneOf(
    ev.eligibility_status,
    ["eligible", "ineligible", "needs_verification", "unknown"] as const,
    "needs_verification"
  );

  // Only keep a quote if it really appears on the page.
  const requirements: GrantRequirement[] = Array.isArray(ev.requirements)
    ? (ev.requirements as Record<string, unknown>[]).slice(0, 6).flatMap((r) => {
        const requirement = text(r.requirement, 300);
        if (!requirement) return [];
        const quote = text(r.source_quote, 220);
        const quoteOk = quote !== null && pageLower.includes(quote.toLowerCase().replace(/\s+/g, " "));
        const determination: RequirementDetermination = oneOf(r.determination, ["pass", "fail", "unknown"] as const, "unknown");
        return [
          {
            requirement,
            mandatory: r.mandatory !== false,
            source_url: grant.official_url,
            source_quote_or_excerpt: quoteOk ? quote : null,
            techmoms_evidence: text(r.techmoms_evidence, 300),
            determination,
            reason: text(r.reason, 300) ?? "No reason given.",
          },
        ];
      })
    : [];

  const mandatory = requirements.filter((r) => r.mandatory);
  const confirmedPercent =
    mandatory.length > 0
      ? Math.round((mandatory.filter((r) => r.determination === "pass").length / mandatory.length) * 100)
      : null;

  const fit = num(ev.fit_percent) !== null ? Math.min(100, Math.round(num(ev.fit_percent) as number)) : null;

  // A deadline that already passed means the grant is not open right now.
  const deadline = isoDate(ev.deadline_iso);
  const deadlineOk = deadline !== null && deadline >= todayIso() ? deadline : null;
  let status: GrantStatus = grant.status;
  if (status === "open" && deadline !== null && deadline < todayIso()) status = "needs_verification";

  const min = num(ev.award_min_usd) ?? grant.funding.minimum_award;
  const max = num(ev.award_max_usd) ?? grant.funding.maximum_award;
  // Plain, labeled starting point: the top of the stated range, capped at a realistic ask size
  // for a small nonprofit. Staff should adjust it.
  const topOfRange = max ?? min;
  const recommended =
    eligibility === "ineligible" || topOfRange === null ? null : Math.min(topOfRange, MAX_RECOMMENDED_ASK_USD);

  const priority = computePriority(fit, eligibility, deadlineOk, status);
  const programs = Array.isArray(ev.matched_program_ids)
    ? (ev.matched_program_ids as unknown[]).filter((p): p is string => typeof p === "string" && (PROGRAM_IDS as readonly string[]).includes(p))
    : [];

  const missing: string[] = [];
  if (!deadlineOk) missing.push("cycle.deadline");
  if (min === null && max === null) missing.push("funding.award_range");

  const complexity: ApplicationComplexity = oneOf(ev.application_complexity, ["low", "medium", "high", "unknown"] as const, "unknown");
  const competitiveness: CompetitivenessBand = "unknown";

  return {
    ...grant,
    status,
    cycle: {
      ...grant.cycle,
      deadline: deadlineOk ?? grant.cycle.deadline,
      opens_on: isoDate(ev.opens_on_iso) ?? grant.cycle.opens_on,
      recurrence: text(ev.recurrence, 60) ?? grant.cycle.recurrence,
    },
    funding: {
      ...grant.funding,
      minimum_award: min,
      maximum_award: max,
      number_of_awards: num(ev.number_of_awards) ?? grant.funding.number_of_awards,
      matching_funds_required: typeof ev.matching_required === "boolean" ? ev.matching_required : grant.funding.matching_funds_required,
      recommended_request_usd: recommended,
      recommendation_basis:
        recommended !== null
          ? `Top of the award range on the funder's page, capped at $${MAX_RECOMMENDED_ASK_USD.toLocaleString("en-US")} as a realistic ask for a small nonprofit. A starting point, not a prediction; adjust once eligibility is confirmed.`
          : grant.funding.recommendation_basis,
    },
    scope: {
      ...grant.scope,
      geographic_level: text(ev.geographic_scope, 80),
      eligible_states: strings(ev.eligible_states, 10, 40),
      topics: strings(ev.topics, 5, 60).length > 0 ? strings(ev.topics, 5, 60) : grant.scope.topics,
    },
    requirements,
    analysis: {
      ...grant.analysis,
      eligibility_status: eligibility,
      mandatory_requirements_confirmed_percent: confirmedPercent,
      strategic_fit_percent: fit,
      strategic_fit_rationale: text(ev.fit_rationale, 500) ?? grant.analysis.strategic_fit_rationale,
      competitiveness_band: competitiveness,
      priority_score: priority,
      matched_program_ids: programs,
      strengths: strings(ev.strengths, 3),
      risks: [...new Set([...strings(ev.risks, 3), ...grant.analysis.risks])].slice(0, 5),
      missing_information_questions: strings(ev.missing_information_questions, 3),
      recommended_action: eligibility === "ineligible" ? "dismiss" : eligibility === "eligible" ? "advance_to_draft" : "verify_eligibility",
    },
    dashboard: {
      ...grant.dashboard,
      category: text(ev.category, 40) ?? grant.dashboard.category,
      geographic_scope: text(ev.geographic_scope, 80) ?? grant.dashboard.geographic_scope,
    },
    data_quality: {
      ...grant.data_quality,
      confidence: "page_read_by_gemini",
      evaluated_with_profile: fingerprint,
      missing_fields: missing,
      notes: [
        ...grant.data_quality.notes.filter((n) => !n.startsWith("Found by Gemini web search")),
        // Flag any result that leaned on an invented fact about Tech-Moms.
        ...(requirements.some((r) => r.techmoms_evidence?.startsWith("Assumption:"))
          ? [DEMO_ASSUMPTION_NOTE]
          : []),
        "Evaluated by Gemini from the funder's page text. Quotes are checked against the page, but eligibility is a suggestion: staff must confirm.",
        `Priority score = fit × eligibility factor × timing factor (formula in the app, not chosen by Gemini).`,
      ],
    },
    application: {
      ...grant.application,
      letter_of_intent_required: typeof ev.letter_of_intent_required === "boolean" ? ev.letter_of_intent_required : null,
      application_complexity: complexity,
      estimated_hours: num(ev.estimated_hours),
      hours_estimate_basis: num(ev.estimated_hours) !== null ? "Gemini's rough estimate from the application requirements on the page." : null,
      required_attachments: strings(ev.required_attachments, 8, 120),
      submission_method: text(ev.submission_method, 120),
    },
  };
}

/** Priority is computed here so it is explainable: fit × eligibility factor × timing factor. */
function computePriority(
  fit: number | null,
  eligibility: EligibilityStatus,
  deadline: string | null,
  status: GrantStatus
): number | null {
  if (fit === null) return null;
  const eligibilityFactor = { eligible: 1, needs_verification: 0.85, unknown: 0.7, ineligible: 0.2 }[eligibility];
  const timingFactor = status === "closed" || status === "needs_verification" ? 0.6 : deadline ? 1 : 0.9;
  return Math.round(fit * eligibilityFactor * timingFactor);
}

// ---- small helpers ---------------------------------------------------------

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) await fn(items[next++]);
    })
  );
}
