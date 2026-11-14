import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Info,
  Loader2,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { CandidateVerification, DiscoveryJob, GrantCandidate } from "../types/grant.ts";
import { formatCurrency } from "../utils/formatters.ts";

interface DiscoveryPreviewResponse {
  live_discovery_enabled: boolean;
  phase: string;
  message: string;
  configured_search_topics: string[];
  geography_constraints: {
    states: string[];
    national_allowed: boolean;
    willing_to_expand_to_other_states: boolean;
  };
  thresholds: {
    minimum_preferred_award_usd: number;
    maximum_application_effort_hours: number;
  };
  server_gemini_ready: boolean;
  planned_model: string;
}

interface GrantSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when a new discovery run finishes, so the dashboard can reload its grants. */
  onDiscoveryComplete?: () => void;
}

const VERIFICATION_LABELS: Record<
  CandidateVerification,
  { label: string; className: string }
> = {
  page_confirmed: {
    label: "Official page verified",
    className: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  page_name_not_found: {
    label: "Page found, grant not confirmed",
    className: "bg-amber-50 text-amber-900 border-amber-200",
  },
  page_blocked: {
    label: "Site blocked our check. Open to confirm",
    className: "bg-amber-50 text-amber-900 border-amber-200",
  },
  unreachable: {
    label: "Link looks broken",
    className: "bg-red-50 text-red-800 border-red-200",
  },
};

export function GrantSearchModal({ isOpen, onClose, onDiscoveryComplete }: GrantSearchModalProps) {
  const [preview, setPreview] = useState<DiscoveryPreviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // `saved` is the last finished run (it stays on screen even if a refresh fails).
  // `current` is a run that is in progress or just failed.
  const [saved, setSaved] = useState<DiscoveryJob | null>(null);
  const [current, setCurrent] = useState<DiscoveryJob | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([
      fetch("/api/discovery/preview", { method: "POST" }).then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as DiscoveryPreviewResponse;
      }),
      fetch("/api/discovery/latest")
        .then(async (res) =>
          res.ok
            ? ((await res.json()) as { job: DiscoveryJob | null; current: DiscoveryJob | null })
            : null
        )
        .catch(() => null),
    ])
      .then(([previewData, latest]) => {
        if (cancelled) return;
        setPreview(previewData);
        if (latest?.job) setSaved(latest.job);
        if (latest?.current) setCurrent(latest.current);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load discovery status");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Poll while a job is running.
  const jobId = current?.job_id;
  const jobStatus = current?.status;
  useEffect(() => {
    if (!isOpen || !jobId || jobStatus !== "running") return;
    const timer = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/discovery/jobs/${encodeURIComponent(jobId)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { job: DiscoveryJob };
        if (data.job.status === "complete") {
          setSaved(data.job);
          setCurrent(null);
          onDiscoveryComplete?.();
        } else {
          setCurrent(data.job);
        }
      } catch {
        // Keep polling; a single failed request is not fatal.
      }
    }, 2000);
    return () => window.clearInterval(timer);
  }, [isOpen, jobId, jobStatus, onDiscoveryComplete]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const runDiscovery = useCallback(async () => {
    setRunError(null);
    try {
      const res = await fetch("/api/discovery/run", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setCurrent(data.job as DiscoveryJob);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Could not start discovery");
    }
  }, []);

  if (!isOpen) return null;

  const isRunning = current?.status === "running";
  const canRun = Boolean(preview?.server_gemini_ready) && !isRunning;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="grant-search-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white border border-slate-200 rounded-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-teal-700" aria-hidden="true" />
            <h2 id="grant-search-modal-title" className="text-base font-semibold text-slate-900">
              Automated Grant Discovery
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-16 bg-slate-100 rounded-md" />
              <div className="h-24 bg-slate-100 rounded-md" />
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
              Unable to reach discovery endpoint: {error}
            </div>
          ) : preview ? (
            <>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-3">
                <Info className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="text-sm text-amber-950 space-y-1">
                  <div className="font-semibold">
                    Candidates only: staff review required before anyone applies
                  </div>
                  <p className="text-xs leading-relaxed text-amber-900">{preview.message}</p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Discovery Parameters
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                    <div className="text-slate-500">Target Geography</div>
                    <div className="mt-1 font-medium text-slate-900">
                      {preview.geography_constraints.states.join(", ")}
                      {preview.geography_constraints.national_allowed ? " + National Grants" : ""}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                    <div className="text-slate-500">Award & Effort Thresholds</div>
                    <div className="mt-1 font-mono tabular-nums font-medium text-slate-900">
                      ≥ {formatCurrency(preview.thresholds.minimum_preferred_award_usd)} · ≤{" "}
                      {preview.thresholds.maximum_application_effort_hours}h effort
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium text-slate-600 mb-1.5">
                    Tech-Moms Search Topics ({preview.configured_search_topics.length})
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {preview.configured_search_topics.join(" · ")}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3 text-xs">
                  <span className="text-slate-600">
                    Gemini web search ({preview.planned_model})
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                    <CheckCircle2
                      className={`w-3.5 h-3.5 ${
                        preview.server_gemini_ready ? "text-emerald-700" : "text-slate-400"
                      }`}
                      aria-hidden="true"
                    />
                    <span>
                      {preview.server_gemini_ready
                        ? "Server API Key Detected"
                        : "Awaiting API Key in Secrets"}
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={runDiscovery}
                  disabled={!canRun}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-md transition-colors cursor-pointer"
                >
                  {isRunning ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Search className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  {isRunning ? "Searching…" : saved ? "Run discovery again" : "Run discovery"}
                </button>
                {isRunning && current ? (
                  <span className="text-xs text-slate-600" role="status">
                    {current.progress.message} This can take a few minutes.
                  </span>
                ) : null}
              </div>

              {runError ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-800">
                  {runError}
                </div>
              ) : null}

              {current?.status === "failed" ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-800 break-words">
                  <span className="font-semibold">The latest run did not finish.</span> {current.error}
                </div>
              ) : null}

              {saved ? <CandidateResults job={saved} /> : null}
            </>
          ) : null}
        </div>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function CandidateResults({ job }: { job: DiscoveryJob }) {
  const failedSearches = job.queries.filter((q) => q.error).length;
  const usable = job.candidates.filter((c) => c.verification !== "unreachable");
  const brokenLinks = job.candidates.filter((c) => c.verification === "unreachable");

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
          {usable.length} possible grants found
        </h3>
        <span className="text-xs text-slate-500">
          {new Date(job.finished_at ?? job.started_at).toLocaleString()}
        </span>
      </div>

      {failedSearches > 0 ? (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
          {failedSearches} of {job.queries.length} searches failed, so this list may be incomplete.
          Try running discovery again.
        </div>
      ) : null}

      {job.candidates.length === 0 ? (
        <p className="text-xs text-slate-600">No grants were found. Try running discovery again.</p>
      ) : (
        <ul className="space-y-2">
          {usable.map((candidate) => (
            <CandidateCard key={candidate.candidate_id} candidate={candidate} />
          ))}
        </ul>
      )}

      {brokenLinks.length > 0 ? (
        <details className="border border-slate-200 rounded-md">
          <summary className="px-3 py-2 text-xs font-medium text-slate-700 cursor-pointer hover:bg-slate-50">
            {brokenLinks.length} more with links we could not open (the names may still be worth a manual search)
          </summary>
          <ul className="p-3 pt-1 space-y-2">
            {brokenLinks.map((candidate) => (
              <CandidateCard key={candidate.candidate_id} candidate={candidate} />
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function CandidateCard({ candidate }: { candidate: GrantCandidate }) {
  const badge = VERIFICATION_LABELS[candidate.verification];

  return (
    <li className="p-3 border border-slate-200 rounded-md space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <a
            href={candidate.official_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-start gap-1.5 text-sm font-semibold text-teal-800 hover:underline"
          >
            <span>{candidate.name}</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
          </a>
          <div className="text-xs text-slate-600">{candidate.funder}</div>
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium border rounded-full ${badge.className}`}
          title={candidate.verification_note}
        >
          {candidate.verification === "page_confirmed" ? (
            <ShieldCheck className="w-3 h-3" aria-hidden="true" />
          ) : (
            <AlertTriangle className="w-3 h-3" aria-hidden="true" />
          )}
          {badge.label}
        </span>
      </div>

      {candidate.why_relevant ? (
        <p className="text-xs text-slate-700 leading-relaxed">{candidate.why_relevant}</p>
      ) : null}

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div>
          <dt className="inline text-slate-500">Deadline: </dt>
          <dd className="inline text-slate-800">{candidate.deadline_text ?? "Not stated"}</dd>
        </div>
        <div>
          <dt className="inline text-slate-500">Award: </dt>
          <dd className="inline text-slate-800">{candidate.award_text ?? "Not stated"}</dd>
        </div>
      </dl>

      <p className="text-[11px] text-slate-500 leading-relaxed">{candidate.verification_note}</p>
    </li>
  );
}
