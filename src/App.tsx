import { useCallback, useEffect, useMemo, useState } from "react";
import { GrantDetailDrawer } from "./components/GrantDetailDrawer.tsx";
import { GrantSearchModal } from "./components/GrantSearchModal.tsx";
import { OrgProfileView } from "./components/OrgProfileView.tsx";
import { PipelineBoard } from "./components/PipelineBoard.tsx";
import { SetAsideGrants } from "./components/SetAsideGrants.tsx";
import {
  type AppTab,
  GrantDashboard,
  TopBar,
  type WorkflowPatch,
} from "./dashboard/GrantDashboard.tsx";
import type { EvaluationJob, GrantRecord, PipelineStage, TechMomsProfile } from "./types/grant.ts";
import { partitionGrants } from "./utils/setAside.ts";

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>("dashboard");
  const [grants, setGrants] = useState<GrantRecord[]>([]);
  const [profile, setProfile] = useState<TechMomsProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  // The dashboard engine keeps its own state after it mounts, so it is re-mounted (new key)
  // whenever the grants themselves change: after a discovery run or an evaluation.
  const [dataVersion, setDataVersion] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [asideGrantId, setAsideGrantId] = useState<string | null>(null);

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [grantsRes, profileRes] = await Promise.all([
        fetch("/api/grants"),
        fetch("/api/profile"),
      ]);
      if (!grantsRes.ok) throw new Error(`Unable to load grants (${grantsRes.status})`);
      if (!profileRes.ok) throw new Error(`Unable to load organization profile (${profileRes.status})`);
      const grantsJson = (await grantsRes.json()) as { grants: GrantRecord[] };
      setGrants(grantsJson.grants);
      setProfile((await profileRes.json()) as TechMomsProfile);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load dashboard data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  /** Reload grants quietly and re-mount the dashboard so it shows the new data. */
  const refreshGrants = useCallback(async () => {
    try {
      const res = await fetch("/api/grants");
      if (!res.ok) return;
      const json = (await res.json()) as { grants: GrantRecord[] };
      setGrants(json.grants);
      setDataVersion((v) => v + 1);
    } catch {
      // Keep what is on screen.
    }
  }, []);

  const handleUpdateWorkflow = useCallback(async (grantId: string, patch: WorkflowPatch) => {
    const res = await fetch(`/api/grants/${encodeURIComponent(grantId)}/workflow`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(`Failed to update workflow (${res.status})`);
    const { grant: updated } = (await res.json()) as { grant: GrantRecord };
    setGrants((prev) => prev.map((item) => (item.grant_id === updated.grant_id ? updated : item)));
  }, []);

  const handleMoveStage = (grantId: string, nextStage: PipelineStage) =>
    handleUpdateWorkflow(grantId, { pipeline_stage: nextStage });

  // Editing a set-aside grant may move it back into the main list, so reload the dashboard after.
  const handleAsideUpdate = async (grantId: string, patch: object) => {
    await handleUpdateWorkflow(grantId, patch as WorkflowPatch);
    setDataVersion((v) => v + 1);
  };

  // ---- Gemini evaluation of the real grants ------------------------------
  const [evaluation, setEvaluation] = useState<EvaluationJob | null>(null);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/grants/evaluate/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { evaluation: EvaluationJob } | null) => {
        if (data) setEvaluation(data.evaluation);
      })
      .catch(() => undefined);
  }, []);

  const evaluationStatus = evaluation?.status;
  useEffect(() => {
    if (evaluationStatus !== "running") return;
    const timer = window.setInterval(async () => {
      try {
        const res = await fetch("/api/grants/evaluate/status");
        if (!res.ok) return;
        const data = (await res.json()) as { evaluation: EvaluationJob };
        setEvaluation(data.evaluation);
        if (data.evaluation.status !== "running") await refreshGrants();
      } catch {
        // Keep polling.
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [evaluationStatus, refreshGrants]);

  const handleEvaluate = async () => {
    setEvaluationError(null);
    try {
      const res = await fetch("/api/grants/evaluate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setEvaluation(data.evaluation as EvaluationJob);
    } catch (error) {
      setEvaluationError(error instanceof Error ? error.message : "Could not start evaluation");
    }
  };

  // Ineligible, very low fit, or broken-link grants go to a collapsed section at the bottom.
  const { shown: shownGrants, setAside } = useMemo(() => partitionGrants(grants), [grants]);
  const asideGrant = grants.find((g) => g.grant_id === asideGrantId) ?? null;

  const isDemo = grants.length > 0 && grants.every((g) => g.is_demo_data);
  const isEvaluating = evaluation?.status === "running";
  const evaluationMessage =
    evaluationError ??
    (isEvaluating
      ? `${evaluation?.progress.message ?? ""} The list updates when it finishes.`
      : evaluation?.status === "failed"
        ? `Evaluation did not finish. ${evaluation.error ?? ""} Grants evaluated so far were kept.`
        : null);

  const navigate = (tab: AppTab) => {
    setOpenId(null);
    setActiveTab(tab);
  };

  return (
    <div className="tmd">
      <TopBar active={activeTab} onNavigate={navigate} />
      {isLoading ? (
        <p className="tmd-loading">Loading grant opportunities…</p>
      ) : loadError ? (
        <div className="tmd-error" role="alert">
          <b>We couldn’t load the dashboard.</b> {loadError}. Check that the server is running, then
          reload the page.
        </div>
      ) : activeTab === "dashboard" && profile ? (
        <>
          <div className="tmd-legacy" style={{ paddingBottom: 0 }}>
            <div style={{ display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: 8 }}>
              {!isDemo && grants.length > 0 && (
                <button type="button" className="btn sm" onClick={handleEvaluate} disabled={isEvaluating}>
                  {isEvaluating ? "Evaluating…" : "Evaluate grants"}
                </button>
              )}
              <button type="button" className="btn sm primary" onClick={() => setIsSearchOpen(true)}>
                Run grant search
              </button>
            </div>
            {evaluationMessage && (
              <p role="status" style={{ margin: "10px 0 0", fontSize: 13, textAlign: "right" }}>
                {evaluationMessage}
              </p>
            )}
          </div>
          <GrantDashboard
            key={dataVersion}
            grants={shownGrants}
            profile={profile}
            onPatch={handleUpdateWorkflow}
            openId={openId}
          />
          <div className="tmd-legacy" style={{ paddingTop: 0 }}>
            <SetAsideGrants items={setAside} onSelectGrant={(grant) => setAsideGrantId(grant.grant_id)} />
          </div>
        </>
      ) : activeTab === "pipeline" ? (
        <div className="tmd-legacy">
          <PipelineBoard
            grants={shownGrants}
            onSelectGrant={(grant) => {
              setOpenId(grant.grant_id);
              setActiveTab("dashboard");
            }}
            onMoveStage={handleMoveStage}
          />
        </div>
      ) : (
        <div className="tmd-legacy">
          <OrgProfileView profile={profile} isLoading={isLoading} />
        </div>
      )}

      {/* Details for grants in the "Set aside" list (they are not part of the dashboard's own list). */}
      <GrantDetailDrawer
        grant={asideGrant}
        onClose={() => setAsideGrantId(null)}
        onUpdateWorkflow={handleAsideUpdate}
      />

      <GrantSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onDiscoveryComplete={refreshGrants}
      />
    </div>
  );
}
