import crypto from "node:crypto";
import dns from "node:dns/promises";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGeminiClient } from "./gemini.ts";
import type {
  CandidateVerification,
  DiscoveryJob,
  DiscoveryQueryResult,
  GrantCandidate,
  TechMomsProfile,
} from "../src/types/grant.ts";

// Discovery needs the Google Search tool. In testing, this key had Search quota on
// gemini-2.5-flash but not on gemini-4-hydrogen (HTTP 429). Override with GEMINI_DISCOVERY_MODEL.
export const GEMINI_DISCOVERY_MODEL =
  process.env.GEMINI_DISCOVERY_MODEL?.trim() || "gemini-2.5-flash";

const TOPIC_GROUPS = 2; // topics are split into this many groups; each group is searched per funder lens
const SEARCH_CONCURRENCY = 3; // Gemini rate-limits search requests, so keep this modest
const MAX_GRANTS_PER_SEARCH = 10;
const SEARCH_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 10_000;

// Each topic group is searched through every lens, so different kinds of funders show up.
const FUNDER_LENSES: { label: string; focus: string }[] = [
  {
    label: "Utah government",
    focus:
      "Utah state agencies, Utah counties and cities, and Utah workforce, education, and economic development offices.",
  },
  {
    label: "Federal agencies",
    focus:
      "U.S. federal agencies and grants.gov opportunities (for example Labor, Education, Commerce, SBA, USDA, NSF, FCC) open to nonprofits.",
  },
  {
    label: "National foundations",
    focus:
      "National private and family foundations and nonprofit intermediaries that fund workforce, education, or women's economic opportunity.",
  },
  {
    label: "Corporate & community",
    focus:
      "Corporate giving programs, tech-company philanthropy, and community foundations (especially in Utah and the Mountain West).",
  },
];
const VERIFY_CONCURRENCY = 6;
const FETCH_TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 5;
const MAX_PAGE_BYTES = 1_500_000;

// ---------------------------------------------------------------------------
// Job registry (in memory; a restart clears it)
// ---------------------------------------------------------------------------

const jobs = new Map<string, DiscoveryJob>();
let latestJobId: string | null = null;
let lastCompleteJobId: string | null = null;

// The last good run is saved to this file (committed with the project), so the app can show
// real results immediately without waiting for a slow, rate-limited live run.
const SAVED_RESULTS_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "data",
  "discovery-latest.json"
);
const MAX_FAILED_SEARCH_RATIO_TO_SAVE = 0.25;

function readSavedJob(): DiscoveryJob | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(SAVED_RESULTS_PATH, "utf-8")) as DiscoveryJob;
    return parsed.status === "complete" && Array.isArray(parsed.candidates) ? parsed : null;
  } catch {
    return null;
  }
}

/** Saves a finished run unless too many searches failed and a better saved run already exists. */
function saveJobIfGood(job: DiscoveryJob): void {
  const failed = job.queries.filter((q) => q.error).length;
  const ratio = job.queries.length > 0 ? failed / job.queries.length : 1;
  const existing = readSavedJob();
  if (existing && ratio > MAX_FAILED_SEARCH_RATIO_TO_SAVE) return;
  try {
    fs.mkdirSync(path.dirname(SAVED_RESULTS_PATH), { recursive: true });
    fs.writeFileSync(SAVED_RESULTS_PATH, JSON.stringify(job, null, 2));
  } catch {
    // Read-only filesystems (some hosts) can't save; the in-memory result still works.
  }
}

const savedJob = readSavedJob();
if (savedJob) {
  jobs.set(savedJob.job_id, savedJob);
  latestJobId = savedJob.job_id;
  lastCompleteJobId = savedJob.job_id;
}

export function getDiscoveryJob(jobId: string): DiscoveryJob | undefined {
  return jobs.get(jobId);
}

/** The most recent run that finished (live or saved from an earlier day). */
export function getLastCompleteDiscoveryJob(): DiscoveryJob | undefined {
  return lastCompleteJobId ? jobs.get(lastCompleteJobId) : undefined;
}

/** The most recent run if it is still running or failed; undefined once it has completed. */
export function getCurrentDiscoveryJob(): DiscoveryJob | undefined {
  const latest = latestJobId ? jobs.get(latestJobId) : undefined;
  return latest && latest.status !== "complete" ? latest : undefined;
}

/** Starts a discovery run in the background. Returns the running job if one already exists. */
export function startDiscoveryJob(profile: TechMomsProfile): DiscoveryJob {
  const existing = latestJobId ? jobs.get(latestJobId) : undefined;
  if (existing && existing.status === "running") return existing;

  const job: DiscoveryJob = {
    job_id: crypto.randomUUID(),
    status: "running",
    started_at: new Date().toISOString(),
    finished_at: null,
    model: GEMINI_DISCOVERY_MODEL,
    progress: { stage: "starting", message: "Starting discovery…" },
    queries: [],
    candidates: [],
    error: null,
  };
  jobs.set(job.job_id, job);
  latestJobId = job.job_id;

  runDiscovery(profile, job).catch((error) => {
    job.status = "failed";
    job.error = error instanceof Error ? error.message : String(error);
    job.finished_at = new Date().toISOString();
    job.progress = { stage: "failed", message: job.error };
  });

  return job;
}

// ---------------------------------------------------------------------------
// Pipeline: search -> dedupe -> verify the official page
// ---------------------------------------------------------------------------

async function runDiscovery(profile: TechMomsProfile, job: DiscoveryJob): Promise<void> {
  const topics = profile.grant_preferences.search_topics;
  const groups = chunk(topics, Math.ceil(topics.length / TOPIC_GROUPS));
  const tasks = groups.flatMap((group) => FUNDER_LENSES.map((lens) => ({ group, lens })));

  job.progress = {
    stage: "searching",
    message: `Searching the web for grants (${tasks.length} searches)…`,
  };

  const raw: RawCandidate[] = [];
  let finished = 0;

  await mapPool(tasks, SEARCH_CONCURRENCY, async ({ group, lens }) => {
    const result: DiscoveryQueryResult = {
      lens: lens.label,
      topics: group,
      raw_candidates: 0,
      error: null,
    };
    try {
      const found = await withRetry(() => searchForGrants(profile, group, lens.focus));
      result.raw_candidates = found.length;
      raw.push(...found);
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
    }
    job.queries.push(result);
    finished += 1;
    job.progress = {
      stage: "searching",
      message: `Search ${finished} of ${tasks.length} complete (${raw.length} possible grants so far)…`,
    };
  });

  if (job.queries.length > 0 && job.queries.every((q) => q.error)) {
    throw new Error(explainSearchError(job.queries[0].error ?? ""));
  }

  const unique = dedupe(raw);

  job.progress = {
    stage: "verifying",
    message: `Checking ${unique.length} official pages…`,
  };

  let checked = 0;
  const verified = await mapPool(unique, VERIFY_CONCURRENCY, async (candidate) => {
    const outcome = await verifyOfficialPage(candidate);
    checked += 1;
    job.progress = {
      stage: "verifying",
      message: `Checked ${checked} of ${unique.length} official pages…`,
    };
    return toCandidate(candidate, outcome);
  });

  job.candidates = mergeByFinalUrl(verified).sort(compareCandidates);
  job.status = "complete";
  job.finished_at = new Date().toISOString();
  lastCompleteJobId = job.job_id;
  saveJobIfGood(job);
  job.progress = {
    stage: "complete",
    message: `Found ${job.candidates.length} possible grants. Each still needs staff review.`,
  };
}

// ---------------------------------------------------------------------------
// Step 1: Gemini with Google Search grounding
// ---------------------------------------------------------------------------

interface RawCandidate {
  name: string;
  funder: string;
  official_url: string;
  why_relevant: string;
  status_hint: GrantCandidate["status_hint"];
  deadline_text: string | null;
  award_text: string | null;
  matched_topics: string[];
  groundedHosts: Set<string>;
  /** Real pages Google Search returned for this query (title is the site's domain). */
  groundedSources: GroundedSource[];
}

interface GroundedSource {
  host: string;
  uri: string;
}

/** Turns Gemini's raw error JSON into a sentence a staff member can act on. */
function explainSearchError(raw: string): string {
  if (/per day|PerDay/i.test(raw)) {
    const wait = raw.match(/retry in (?:(\d+)h)?(?:(\d+)m)?/i);
    const hours = wait?.[1] ? Number(wait[1]) : null;
    const when = hours !== null ? `about ${hours + 1} hours` : "within 24 hours";
    return `Google's free daily limit for Gemini web search has been reached. It resets in ${when}. Your saved results are still available below; try running discovery again then.`;
  }
  if (/\b429\b|RESOURCE_EXHAUSTED/i.test(raw)) {
    return "Google is rate-limiting Gemini web search right now. Wait a few minutes and run discovery again. Your saved results are still available below.";
  }
  if (/API key|API_KEY|PERMISSION_DENIED|\b40[13]\b/i.test(raw)) {
    return "Google rejected the Gemini API key. Check GEMINI_API_KEY in your .env file (or the AI Studio secret) and restart the app.";
  }
  return `Every Gemini search failed. ${raw.slice(0, 300)}`;
}

/** Retries rate-limit (429) and overload (503) errors with a growing pause. */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const retryable = /\b(429|503)\b|RESOURCE_EXHAUSTED|UNAVAILABLE|overloaded|high demand/i.test(message);
      // A daily quota won't reset for hours, so waiting and retrying only wastes time.
      const dailyLimit = /per day|PerDay/i.test(message);
      if (!retryable || dailyLimit || attempt >= SEARCH_RETRIES) throw error;
      await new Promise((resolve) => setTimeout(resolve, RETRY_BASE_DELAY_MS * (attempt + 1)));
    }
  }
}

function buildPrompt(profile: TechMomsProfile, topics: string[], focus: string): string {
  const org = profile.organization;
  const prefs = profile.grant_preferences;
  const today = new Date().toISOString().slice(0, 10);

  return `You are a grant researcher for a nonprofit. Today's date is ${today}.
Use Google Search to find REAL grant programs this organization could apply for.

ORGANIZATION
- Name: ${org.name.value}
- Mission: ${org.mission.value}
- Based in: ${profile.service_area.states.value.join(", ")} (${profile.service_area.locations.value.join(", ")})
- Serves: ${profile.populations.primary.value.join(", ")}
- Programs: ${profile.programs.map((p) => p.name).join("; ")}
- Preferred minimum award: about $${prefs.minimum_preferred_award_usd.value.toLocaleString("en-US")}
- Government grants ok: ${prefs.government_grants_allowed.value ? "yes" : "no"}; national grants ok: ${prefs.national_grants_allowed.value ? "yes" : "no"}

SEARCH THESE TOPICS: ${topics.join(", ")}
LOOK AT THIS KIND OF FUNDER: ${focus}

RULES
- Only include grant programs that are open now, opening soon, or recur on a regular cycle.
- Include Utah-specific grants and national grants that a Utah nonprofit can apply for.
- Exclude individual scholarships, loans, prizes for individuals, and anything clearly closed with no future cycle.
- official_url must be the funder's own page for that program, copied from your search results. Never guess or build a URL. If you cannot find the real page, leave that grant out.
- Copy deadline_text and award_text as stated on the page. Use null when the page does not say.
- Return at most ${MAX_GRANTS_PER_SEARCH} grants, only ones from the kind of funder named above.

Respond with ONLY a JSON array, no other text. Each item:
{"name": string, "funder": string, "official_url": string, "why_relevant": string (1-2 sentences), "status_hint": "open" | "upcoming" | "recurring_not_yet_open" | "unknown", "deadline_text": string | null, "award_text": string | null, "matched_topics": string[]}`;
}

async function searchForGrants(
  profile: TechMomsProfile,
  topics: string[],
  focus: string
): Promise<RawCandidate[]> {
  const ai = createGeminiClient();
  const response = await ai.models.generateContent({
    model: GEMINI_DISCOVERY_MODEL,
    contents: buildPrompt(profile, topics, focus),
    config: { tools: [{ googleSearch: {} }], temperature: 0.2 },
  });

  const groundedHosts = new Set<string>();
  const groundedSources: GroundedSource[] = [];
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  for (const c of chunks) {
    const title = c.web?.title?.toLowerCase().trim();
    if (title) groundedHosts.add(stripWww(title));
    if (title && c.web?.uri && isHttpUrl(c.web.uri)) {
      groundedSources.push({ host: stripWww(title), uri: c.web.uri });
    }
    const host = safeHost(c.web?.uri);
    if (host && !host.endsWith("vertexaisearch.cloud.google.com")) groundedHosts.add(stripWww(host));
  }

  const parsed = parseJsonArray(response.text ?? "");
  const out: RawCandidate[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const name = str(r.name);
    const funder = str(r.funder);
    const url = str(r.official_url);
    if (!name || !funder || !url || !isHttpUrl(url)) continue;
    const status = str(r.status_hint);
    out.push({
      name,
      funder,
      official_url: url,
      why_relevant: str(r.why_relevant) ?? "",
      status_hint:
        status === "open" || status === "upcoming" || status === "recurring_not_yet_open"
          ? status
          : "unknown",
      deadline_text: str(r.deadline_text),
      award_text: str(r.award_text),
      matched_topics: Array.isArray(r.matched_topics)
        ? r.matched_topics.filter((t): t is string => typeof t === "string")
        : topics,
      groundedHosts,
      groundedSources,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Step 2: dedupe
// ---------------------------------------------------------------------------

function dedupe(items: RawCandidate[]): RawCandidate[] {
  const byKey = new Map<string, RawCandidate>();
  const nameKeyToUrlKey = new Map<string, string>();

  for (const item of items) {
    const urlKey = normalizeUrl(item.official_url);
    const nameKey = slug(`${item.funder} ${item.name}`);
    const existingKey = byKey.has(urlKey) ? urlKey : nameKeyToUrlKey.get(nameKey);
    const existing = existingKey ? byKey.get(existingKey) : undefined;

    if (existing) {
      existing.matched_topics = [...new Set([...existing.matched_topics, ...item.matched_topics])];
      item.groundedHosts.forEach((h) => existing.groundedHosts.add(h));
      existing.groundedSources.push(...item.groundedSources);
      existing.deadline_text ??= item.deadline_text;
      existing.award_text ??= item.award_text;
    } else {
      byKey.set(urlKey, {
        ...item,
        groundedHosts: new Set(item.groundedHosts),
        groundedSources: [...item.groundedSources],
      });
      nameKeyToUrlKey.set(nameKey, urlKey);
    }
  }
  return [...byKey.values()];
}

// ---------------------------------------------------------------------------
// Step 3: verify the official page is real and mentions the grant
// ---------------------------------------------------------------------------

interface VerifyOutcome {
  verification: CandidateVerification;
  note: string;
  finalUrl: string;
}

const MAX_FALLBACK_SOURCES = 4;

async function verifyOfficialPage(candidate: RawCandidate): Promise<VerifyOutcome> {
  const primary = await checkUrl(candidate.official_url, candidate.name);
  if (primary.verification !== "unreachable") return primary;

  // The URL Gemini typed is broken. Try real pages Google Search returned for the same site.
  const host = stripWww(safeHost(candidate.official_url) ?? "");
  const seen = new Set<string>();
  const sources = candidate.groundedSources
    .filter((s) => host && (s.host === host || host.endsWith(`.${s.host}`) || s.host.endsWith(`.${host}`)))
    .filter((s) => !seen.has(s.uri) && seen.add(s.uri))
    .slice(0, MAX_FALLBACK_SOURCES);

  let bestPartial: VerifyOutcome | null = null;
  for (const source of sources) {
    const result = await checkUrl(source.uri, candidate.name);
    if (result.verification === "page_confirmed") {
      return {
        ...result,
        note: "Gemini's link was broken, so this page was found through Google Search results instead. It mentions the grant by name.",
      };
    }
    if (result.verification === "page_name_not_found" && !bestPartial) {
      bestPartial = {
        ...result,
        note: "Gemini's link was broken, so this page was found through Google Search results instead, but the grant name was not found on it.",
      };
    }
  }
  return bestPartial ?? primary;
}

async function checkUrl(url: string, grantName: string): Promise<VerifyOutcome> {
  const candidate = { official_url: url, name: grantName };
  try {
    const page = await fetchPage(candidate.official_url);
    if (page.kind === "pdf") {
      return {
        verification: "page_name_not_found",
        note: "Official link is a PDF; its contents were not checked automatically.",
        finalUrl: page.finalUrl,
      };
    }
    if (nameAppearsOnPage(candidate.name, page.text)) {
      return {
        verification: "page_confirmed",
        note: "Official page loaded and mentions this grant by name.",
        finalUrl: page.finalUrl,
      };
    }
    return {
      verification: "page_name_not_found",
      note: "Page loaded but the grant name was not found on it. The link may be a general page or need JavaScript.",
      finalUrl: page.finalUrl,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isBlockedError(error)) {
      return {
        verification: "page_blocked",
        note: `The site refused or timed out our automatic check (${message}). Open the link to confirm it is real.`,
        finalUrl: candidate.official_url,
      };
    }
    return {
      verification: "unreachable",
      note: `The link looks broken (${message}). Gemini may have given an outdated or wrong URL.`,
      finalUrl: candidate.official_url,
    };
  }
}

class HttpStatusError extends Error {
  constructor(public status: number) {
    super(`HTTP ${status}`);
  }
}

/** Sites that refuse bots (401/403/429/5xx) or are slow are "blocked", not necessarily broken. */
function isBlockedError(error: unknown): boolean {
  if (error instanceof HttpStatusError) {
    return error.status === 401 || error.status === 403 || error.status === 429 || error.status >= 500;
  }
  if (error instanceof Error) {
    return error.name === "TimeoutError" || error.name === "AbortError";
  }
  return false;
}

type FetchedPage = { kind: "html"; text: string; finalUrl: string } | { kind: "pdf"; finalUrl: string };

async function fetchPage(startUrl: string): Promise<FetchedPage> {
  let url = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(url);
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GrantDiscoveryBot/0.1)",
        Accept: "text/html,application/xhtml+xml,application/pdf;q=0.8,*/*;q=0.5",
      },
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new Error(`HTTP ${res.status} with no redirect target`);
      url = new URL(location, url).toString();
      continue;
    }
    if (!res.ok) throw new HttpStatusError(res.status);

    const type = res.headers.get("content-type") ?? "";
    if (type.includes("application/pdf")) {
      await res.body?.cancel();
      return { kind: "pdf", finalUrl: url };
    }
    const buffer = Buffer.from(await res.arrayBuffer()).subarray(0, MAX_PAGE_BYTES);
    return { kind: "html", text: htmlToText(buffer.toString("utf-8")), finalUrl: url };
  }
  throw new Error("Too many redirects");
}

/** Blocks requests to private or internal addresses, since URLs come from an AI model. */
async function assertPublicHost(rawUrl: string): Promise<void> {
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http(s) links are allowed");
  }
  const host = parsed.hostname.replace(/^\[|\]$/g, "");
  const addresses = net.isIP(host)
    ? [host]
    : (await dns.lookup(host, { all: true })).map((a) => a.address);
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new Error("Link points to a private or internal address");
  }
}

function isPrivateAddress(ip: string): boolean {
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v.startsWith("::ffff:")) return isPrivateAddress(v.slice(7));
    return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80");
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#?\w+;/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

const STOP_WORDS = new Set([
  "grant", "grants", "program", "programs", "fund", "funding", "the", "and", "for", "of",
  "to", "in", "a", "an", "initiative", "award", "awards", "2025", "2026", "2027",
]);

function nameAppearsOnPage(name: string, pageText: string): boolean {
  const lowerName = name.toLowerCase();
  if (pageText.includes(lowerName)) return true;
  const tokens = lowerName
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
  if (tokens.length < 2) return false;
  const hits = tokens.filter((t) => pageText.includes(t)).length;
  return hits / tokens.length >= 0.75;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toCandidate(raw: RawCandidate, outcome: VerifyOutcome): GrantCandidate {
  const host = stripWww(safeHost(outcome.finalUrl) ?? "");
  const inResults = [...raw.groundedHosts].some(
    (g) => g === host || host.endsWith(`.${g}`) || g.endsWith(`.${host}`) || g.includes(host)
  );
  return {
    candidate_id: `cand-${crypto.createHash("sha1").update(normalizeUrl(raw.official_url)).digest("hex").slice(0, 10)}`,
    name: raw.name,
    funder: raw.funder,
    official_url: outcome.finalUrl,
    why_relevant: raw.why_relevant,
    status_hint: raw.status_hint,
    deadline_text: raw.deadline_text,
    award_text: raw.award_text,
    matched_topics: raw.matched_topics,
    in_search_results: host.length > 0 && inResults,
    verification: outcome.verification,
    verification_note: outcome.note,
    discovered_at: new Date().toISOString().slice(0, 10),
  };
}

const VERIFICATION_RANK: Record<CandidateVerification, number> = {
  page_confirmed: 0,
  page_name_not_found: 1,
  page_blocked: 2,
  unreachable: 3,
};

/** Second dedupe pass: two different links can redirect to the same final page. */
function mergeByFinalUrl(items: GrantCandidate[]): GrantCandidate[] {
  const byUrl = new Map<string, GrantCandidate>();
  for (const item of items) {
    const key = normalizeUrl(item.official_url);
    const existing = byUrl.get(key);
    if (!existing) {
      byUrl.set(key, item);
      continue;
    }
    existing.matched_topics = [...new Set([...existing.matched_topics, ...item.matched_topics])];
    existing.deadline_text ??= item.deadline_text;
    existing.award_text ??= item.award_text;
    existing.in_search_results ||= item.in_search_results;
  }
  return [...byUrl.values()];
}

function compareCandidates(a: GrantCandidate, b: GrantCandidate): number {
  return (
    VERIFICATION_RANK[a.verification] - VERIFICATION_RANK[b.verification] ||
    a.name.localeCompare(b.name)
  );
}

function parseJsonArray(text: string): unknown[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end <= start) return [];
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function safeHost(value: string | undefined | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function stripWww(host: string): string {
  return host.replace(/^www\./, "");
}

function normalizeUrl(value: string): string {
  try {
    const u = new URL(value);
    return `${stripWww(u.hostname.toLowerCase())}${u.pathname.replace(/\/+$/, "")}`;
  } catch {
    return value.toLowerCase();
  }
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}
