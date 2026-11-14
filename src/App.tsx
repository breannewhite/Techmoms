import { useCallback, useEffect, useState } from "react";
import { OrgProfileView } from "./components/OrgProfileView.tsx";
import { PipelineBoard } from "./components/PipelineBoard.tsx";
import {
  type AppTab,
  GrantDashboard,
  TopBar,
  type WorkflowPatch,
} from "./dashboard/GrantDashboard.tsx";
import type { GrantRecord, PipelineStage, TechMomsProfile } from "./types/grant.ts";

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>("dashboard");
  const [grants, setGrants] = useState<GrantRecord[]>([]);
  const [profile, setProfile] = useState<TechMomsProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

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
        <GrantDashboard grants={grants} profile={profile} onPatch={handleUpdateWorkflow} openId={openId} />
      ) : activeTab === "pipeline" ? (
        <div className="tmd-legacy">
          <PipelineBoard
            grants={grants}
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
    </div>
  );
}
