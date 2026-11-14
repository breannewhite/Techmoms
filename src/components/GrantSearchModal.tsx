import { CheckCircle2, Info, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
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
}

export function GrantSearchModal({ isOpen, onClose }: GrantSearchModalProps) {
  const [preview, setPreview] = useState<DiscoveryPreviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetch("/api/discovery/preview", { method: "POST" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as DiscoveryPreviewResponse;
      })
      .then((data) => {
        if (!cancelled) setPreview(data);
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

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="grant-search-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white border border-slate-200 rounded-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
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

        <div className="p-5 space-y-5">
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
                  <div className="font-semibold">Phase 1 Demo Mode — Live Discovery Not Yet Active</div>
                  <p className="text-xs leading-relaxed text-amber-900">{preview.message}</p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Configured Discovery Parameters (Ready for Phase 2)
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

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-600">
                    Server Gemini Evaluation Engine ({preview.planned_model})
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
            </>
          ) : null}
        </div>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
