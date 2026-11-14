import "dotenv/config";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import { DEMO_GRANTS } from "./server/demoData.ts";
import { GEMINI_ANALYSIS_MODEL, isGeminiConfigured } from "./server/gemini.ts";
import {
  getEvaluationJob,
  getRealGrants,
  replaceRealGrant,
  resetRealWorkflow,
  startEvaluation,
} from "./server/realGrants.ts";
import {
  GEMINI_DISCOVERY_MODEL,
  getCurrentDiscoveryJob,
  getDiscoveryJob,
  getLastCompleteDiscoveryJob,
  startDiscoveryJob,
} from "./server/discovery.ts";
import type {
  GrantRecord,
  PipelineStage,
  StaffStatus,
  AwardOutcome,
  TechMomsProfile,
} from "./src/types/grant.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Synthetic demo grants are only shown when no real grants have been discovered yet.
  let demoStore: GrantRecord[] = structuredClone(DEMO_GRANTS);

  const activeGrants = () => {
    const real = getRealGrants();
    return real.length > 0
      ? { demo_mode: false, grants: real }
      : { demo_mode: true, grants: demoStore };
  };

  const profilePath = path.join(
    __dirname,
    "public",
    "assets",
    "aistudio",
    "techmoms_profile_7c7cac84.json"
  );

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      demo_mode: true,
      gemini_configured: isGeminiConfigured(),
      gemini_model: GEMINI_ANALYSIS_MODEL,
    });
  });

  app.get("/api/profile", (_req, res) => {
    try {
      const raw = fs.readFileSync(profilePath, "utf-8");
      res.json(JSON.parse(raw));
    } catch (error) {
      res.status(500).json({
        error: "Unable to read Tech-Moms profile asset.",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get("/api/grants", (_req, res) => {
    const { demo_mode, grants } = activeGrants();
    res.json({
      demo_mode,
      as_of: new Date().toISOString().slice(0, 10),
      grants,
    });
  });

  // Gemini reads each funder page and fills in requirements, fit, risks and application details.
  app.post("/api/grants/evaluate", (_req, res) => {
    if (!isGeminiConfigured()) {
      res.status(400).json({ error: "GEMINI_API_KEY is not configured on the server." });
      return;
    }
    const profile = JSON.parse(fs.readFileSync(profilePath, "utf-8")) as TechMomsProfile;
    res.status(202).json({ evaluation: startEvaluation(profile) });
  });

  app.get("/api/grants/evaluate/status", (_req, res) => {
    res.json({ evaluation: getEvaluationJob() });
  });

  app.patch("/api/grants/:grantId/workflow", (req, res) => {
    const { grantId } = req.params;
    const { demo_mode: isDemo, grants: grantsStore } = activeGrants();
    const grantIndex = grantsStore.findIndex((g) => g.grant_id === grantId);
    if (grantIndex === -1) {
      res.status(404).json({ error: "Grant not found" });
      return;
    }

    const current = grantsStore[grantIndex];
    const body = req.body as {
      pipeline_stage?: PipelineStage;
      assigned_owner?: string | null;
      internal_notes?: string | null;
      staff_status?: StaffStatus;
      dismissed_reason?: string | null;
      is_saved?: boolean;
      award_outcome?: AwardOutcome;
      amount_awarded_usd?: number | null;
    };

    const today = new Date().toISOString().slice(0, 10);
    const nextStage = body.pipeline_stage ?? current.workflow.pipeline_stage;

    const updated: GrantRecord = {
      ...current,
      dashboard: {
        ...current.dashboard,
        staff_status: body.staff_status ?? current.dashboard.staff_status,
        is_saved:
          typeof body.is_saved === "boolean"
            ? body.is_saved
            : current.dashboard.is_saved ?? current.dashboard.staff_status === "saved",
        dismissed_reason:
          body.dismissed_reason !== undefined
            ? body.dismissed_reason
            : current.dashboard.dismissed_reason,
      },
      workflow: {
        ...current.workflow,
        pipeline_stage: nextStage,
        assigned_owner:
          body.assigned_owner !== undefined
            ? body.assigned_owner
            : current.workflow.assigned_owner,
        internal_notes:
          body.internal_notes !== undefined
            ? body.internal_notes
            : current.workflow.internal_notes,
        award_outcome: body.award_outcome ?? current.workflow.award_outcome,
        amount_awarded_usd:
          body.amount_awarded_usd !== undefined
            ? body.amount_awarded_usd
            : current.workflow.amount_awarded_usd,
        date_qualified:
          nextStage === "qualified" && !current.workflow.date_qualified
            ? today
            : current.workflow.date_qualified,
        date_drafted:
          nextStage === "drafted" && !current.workflow.date_drafted
            ? today
            : current.workflow.date_drafted,
        submitted_at:
          nextStage === "submitted" && !current.workflow.submitted_at
            ? today
            : current.workflow.submitted_at,
        award_decision_at:
          nextStage === "award_decided" && !current.workflow.award_decision_at
            ? today
            : current.workflow.award_decision_at,
      },
    };

    if (isDemo) {
      demoStore[grantIndex] = updated;
    } else {
      replaceRealGrant(updated);
    }
    res.json({ grant: updated });
  });

  // Demo mode: restore the synthetic records. Real mode: clear staff edits, keep grant details.
  app.post("/api/grants/reset-demo", (_req, res) => {
    if (activeGrants().demo_mode) {
      demoStore = structuredClone(DEMO_GRANTS);
      res.json({ demo_mode: true, grants: demoStore });
    } else {
      res.json({ demo_mode: false, grants: resetRealWorkflow() });
    }
  });

  // Live discovery: Gemini searches the web, then each official page is checked server-side.
  app.post("/api/discovery/run", (_req, res) => {
    if (!isGeminiConfigured()) {
      res.status(400).json({ error: "GEMINI_API_KEY is not configured on the server." });
      return;
    }
    try {
      const profile = JSON.parse(fs.readFileSync(profilePath, "utf-8")) as TechMomsProfile;
      res.status(202).json({ job: startDiscoveryJob(profile) });
    } catch (error) {
      res.status(500).json({
        error: "Unable to start discovery.",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // `job` is the last finished run (possibly saved from an earlier day). `current` is a run that
  // is in progress or just failed, so a failed refresh never hides the saved results.
  app.get("/api/discovery/latest", (_req, res) => {
    res.json({
      job: getLastCompleteDiscoveryJob() ?? null,
      current: getCurrentDiscoveryJob() ?? null,
    });
  });

  app.get("/api/discovery/jobs/:jobId", (req, res) => {
    const job = getDiscoveryJob(req.params.jobId);
    if (!job) {
      res.status(404).json({ error: "Discovery job not found" });
      return;
    }
    res.json({ job });
  });

  app.post("/api/discovery/preview", (_req, res) => {
    try {
      const profile = JSON.parse(fs.readFileSync(profilePath, "utf-8"));
      res.json({
        live_discovery_enabled: isGeminiConfigured(),
        phase: "v2_live_discovery",
        message:
          "Live discovery searches the web with Gemini and checks each official page. Results are candidates only: staff must review every grant before anyone applies. Eligibility scoring is the next phase.",
        configured_search_topics: profile.grant_preferences?.search_topics ?? [],
        geography_constraints: {
          states: profile.service_area?.states?.value ?? ["Utah"],
          national_allowed: profile.grant_preferences?.national_grants_allowed?.value ?? true,
          willing_to_expand_to_other_states:
            profile.service_area?.willing_to_expand_to_other_states?.value ?? false,
        },
        thresholds: {
          minimum_preferred_award_usd:
            profile.grant_preferences?.minimum_preferred_award_usd?.value ?? 10000,
          maximum_application_effort_hours:
            profile.grant_preferences?.maximum_application_effort_hours?.value ?? 50,
        },
        server_gemini_ready: isGeminiConfigured(),
        planned_model: GEMINI_DISCOVERY_MODEL,
      });
    } catch (error) {
      res.status(500).json({
        error: "Unable to load discovery configuration.",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("/{*path}", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Tech-Moms Grant Intelligence running on http://localhost:${PORT}`);
  });
}

startServer();
