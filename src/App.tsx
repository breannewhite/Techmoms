import {
  Building2,
  Info,
  Kanban,
  LayoutDashboard,
  Menu,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { GrantDetailDrawer } from "./components/GrantDetailDrawer.tsx";
import { GrantSearchModal } from "./components/GrantSearchModal.tsx";
import { GrantTable } from "./components/GrantTable.tsx";
import { OrgProfileView } from "./components/OrgProfileView.tsx";
import { PipelineBoard } from "./components/PipelineBoard.tsx";
import { SummaryCards } from "./components/SummaryCards.tsx";
import type {
  AwardOutcome,
  GrantRecord,
  PipelineStage,
  StaffStatus,
  TechMomsProfile,
} from "./types/grant.ts";

type ActiveTab = "dashboard" | "pipeline" | "profile";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [grants, setGrants] = useState<GrantRecord[]>([]);
  const [profile, setProfile] = useState<TechMomsProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedGrantId, setSelectedGrantId] = useState<string | null>(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const priorityThreshold = 80;

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [grantsRes, profileRes] = await Promise.all([
        fetch("/api/grants"),
        fetch("/api/profile"),
      ]);
      if (!grantsRes.ok) {
        throw new Error(`Unable to load grants (${grantsRes.status})`);
      }
      if (!profileRes.ok) {
        throw new Error(`Unable to load organization profile (${profileRes.status})`);
      }
      const grantsJson = (await grantsRes.json()) as { grants: GrantRecord[] };
      const profileJson = (await profileRes.json()) as TechMomsProfile;
      setGrants(grantsJson.grants);
      setProfile(profileJson);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to load dashboard data."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleUpdateWorkflow = async (
    grantId: string,
    patch: {
      pipeline_stage?: PipelineStage;
      assigned_owner?: string | null;
      internal_notes?: string | null;
      staff_status?: StaffStatus;
      award_outcome?: AwardOutcome;
      amount_awarded_usd?: number | null;
    }
  ) => {
    const res = await fetch(`/api/grants/${encodeURIComponent(grantId)}/workflow`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      throw new Error(`Failed to update workflow (${res.status})`);
    }

    const { grant: updated } = (await res.json()) as { grant: GrantRecord };
    setGrants((prev) =>
      prev.map((item) => (item.grant_id === updated.grant_id ? updated : item))
    );
  };

  const handleMoveStage = async (grantId: string, nextStage: PipelineStage) => {
    await handleUpdateWorkflow(grantId, { pipeline_stage: nextStage });
  };

  const handleResetDemoData = async () => {
    const res = await fetch("/api/grants/reset-demo", { method: "POST" });
    if (res.ok) {
      const data = (await res.json()) as { grants: GrantRecord[] };
      setGrants(data.grants);
      setSelectedGrantId(null);
    }
  };

  const selectedGrant =
    grants.find((g) => g.grant_id === selectedGrantId) ?? null;

  const activeTabLabel =
    activeTab === "dashboard"
      ? "Dashboard"
      : activeTab === "pipeline"
        ? "Pipeline"
        : "Organization Profile";

  const navItems: Array<{
    id: ActiveTab;
    label: string;
    icon: typeof LayoutDashboard;
  }> = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "pipeline", label: "Pipeline", icon: Kanban },
    { id: "profile", label: "Org Profile", icon: Building2 },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Mobile Sidebar Backdrop */}
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
          onClick={() => setIsMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-150 ${
          isMobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div>
          <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between gap-2">
            <span className="font-display font-bold text-base tracking-tight text-slate-900 whitespace-nowrap truncate">
              Tech-Moms Grants
            </span>
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(false)}
              aria-label="Close navigation"
              className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav aria-label="Primary navigation" className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileNavOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? "bg-teal-50 text-teal-800"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-200 space-y-3">
          <div className="text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800">Synthetic Demo Workspace</div>
            <p className="leading-relaxed text-slate-500">
              Showing simulated grants for Tech-Moms. Use Run Grant Search to find real grant candidates with Gemini. Eligibility evaluation is the next phase.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetDemoData}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-md transition-colors whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Reset Demo State</span>
          </button>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(true)}
              aria-label="Open navigation"
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-500 whitespace-nowrap hidden sm:inline">
                Tech-Moms Grant Intelligence
              </span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="font-semibold text-slate-900 whitespace-nowrap truncate">
                {activeTabLabel}
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsSearchModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Search className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Run Grant Search</span>
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto space-y-6">
          {/* Transparent Demo Data Notice */}
          <div className="bg-white border border-amber-200 rounded-lg px-4 py-3 flex items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start sm:items-center gap-2.5 text-amber-950">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
              <span>
                <strong className="font-semibold">Demo Data Notice:</strong> All grant listings,
                funder names, deadlines, and placeholder URLs below are synthetic test records.
                Automated live grant discovery is not yet connected.
              </span>
            </div>
            <span className="text-slate-500 font-mono tabular-nums whitespace-nowrap shrink-0">
              As of 2026-11-14
            </span>
          </div>

          {loadError ? (
            <div className="bg-white border border-red-200 rounded-lg p-6 text-sm text-red-800 flex items-center justify-between gap-4">
              <span>{loadError}</span>
              <button
                type="button"
                onClick={fetchInitialData}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-red-700 hover:bg-red-800 rounded-md cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {activeTab === "dashboard" && (
                <div className="space-y-6">
                  <SummaryCards grants={grants} priorityThreshold={priorityThreshold} />
                  <GrantTable
                    grants={grants}
                    isLoading={isLoading}
                    selectedGrantId={selectedGrantId}
                    onSelectGrant={(grant) => setSelectedGrantId(grant.grant_id)}
                  />
                </div>
              )}

              {activeTab === "pipeline" && (
                <PipelineBoard
                  grants={grants}
                  onSelectGrant={(grant) => setSelectedGrantId(grant.grant_id)}
                  onMoveStage={handleMoveStage}
                />
              )}

              {activeTab === "profile" && (
                <OrgProfileView profile={profile} isLoading={isLoading} />
              )}
            </>
          )}
        </main>
      </div>

      {/* Detailed Grant View Drawer */}
      <GrantDetailDrawer
        grant={selectedGrant}
        onClose={() => setSelectedGrantId(null)}
        onUpdateWorkflow={handleUpdateWorkflow}
      />

      {/* Run Grant Search Modal */}
      <GrantSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </div>
  );
}
