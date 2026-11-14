import "dotenv/config";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import { DEMO_GRANTS } from "./server/demoData.ts";
import { GEMINI_ANALYSIS_MODEL, isGeminiConfigured } from "./server/gemini.ts";
import type { GrantRecord, PipelineStage, StaffStatus, AwardOutcome } from "./src/types/grant.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // In-memory store for synthetic demo grants during the hackathon session
  let grantsStore: GrantRecord[] = structuredClone(DEMO_GRANTS);

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
    res.json({
      demo_mode: true,
      as_of: "2026-11-14",
      grants: grantsStore,
    });
  });

  app.patch("/api/grants/:grantId/workflow", (req, res) => {
    const { grantId } = req.params;
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

    grantsStore[grantIndex] = updated;
    res.json({ grant: updated });
  });

  app.post("/api/grants/reset-demo", (_req, res) => {
    grantsStore = structuredClone(DEMO_GRANTS);
    res.json({
      demo_mode: true,
      grants: grantsStore,
    });
  });

  // Honest Phase-1 endpoint: explains planned automated discovery without inventing live results
  app.post("/api/discovery/preview", (_req, res) => {
    try {
      const profile = JSON.parse(fs.readFileSync(profilePath, "utf-8"));
      res.json({
        live_discovery_enabled: false,
        phase: "v1_synthetic_demo",
        message:
          "Automated web discovery and Gemini-powered eligibility evaluation are scheduled for Phase 2. This workspace currently displays synthetic demo records only.",
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
        planned_model: GEMINI_ANALYSIS_MODEL,
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
