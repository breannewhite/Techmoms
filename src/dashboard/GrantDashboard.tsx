import { useEffect, useRef } from "react";
import type { GrantRecord, TechMomsProfile } from "../types/grant.ts";
import { mountDashboard } from "./engine.js";
import "./dashboard.css";

export type AppTab = "dashboard" | "pipeline" | "profile";
export type WorkflowPatch = Record<string, unknown>;

const NAV: Array<[AppTab, string]> = [
  ["dashboard", "Opportunities"],
  ["pipeline", "Pipeline"],
  ["profile", "Org Profile"],
];

export function TopBar({
  active,
  onNavigate,
}: {
  active: AppTab;
  onNavigate: (tab: AppTab) => void;
}) {
  return (
    <header className="top">
      <div className="brand">
        <img className="logo" src="/assets/techmoms-logo.png" alt="Tech-Moms" width={58} height={34} />
        <span className="brand-sep" aria-hidden="true" />
        <span>Grants</span>
      </div>
      <nav className="nav" aria-label="Main">
        {NAV.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={active === id ? "on" : ""}
            aria-current={active === id ? "page" : undefined}
            onClick={() => onNavigate(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      {/* The dashboard engine renders the reminder bell into this slot. */}
      <div id="bellwrap" className="bellwrap" />
      <div className="avatar" aria-label="Signed in as admin">
        AD
      </div>
    </header>
  );
}

/**
 * Mounts the dashboard (ported 1:1 from the approved prototype) once data has loaded.
 * The engine keeps its own UI state; every change that matters is sent to the API via onPatch.
 */
export function GrantDashboard({
  grants,
  profile,
  onPatch,
  openId,
}: {
  grants: GrantRecord[];
  profile: TechMomsProfile;
  onPatch: (grantId: string, patch: WorkflowPatch) => Promise<void>;
  openId?: string | null;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const latest = useRef({ grants, profile, onPatch, openId });
  latest.current = { grants, profile, onPatch, openId };

  useEffect(() => {
    if (!rootRef.current) return;
    const { grants: g, profile: p, onPatch: patch, openId: id } = latest.current;
    return mountDashboard(rootRef.current, {
      grants: structuredClone(g),
      profile: p,
      onPatch: (grantId: string, body: WorkflowPatch) => latest.current.onPatch(grantId, body),
      openId: id,
    });
    // Mount once per visit to the tab; later data changes come from the engine itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef}>
      <main className="tmd-main" id="app" />
      <div className="scrim" id="scrim" />
      <aside className="panel" id="panel" role="dialog" aria-modal="true" aria-labelledby="ptitle" />
      <div className="toast" id="toast" role="status" />
    </div>
  );
}
