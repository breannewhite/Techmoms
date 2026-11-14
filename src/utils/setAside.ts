import type { GrantRecord } from "../types/grant.ts";

/** Evaluated grants that fit the mission less than this are set aside. Scores below 40 sit in a
 *  separate cluster from the rest in the saved evaluation (nothing scored 41-54). */
export const MIN_FIT_PERCENT = 40;

export type SetAsideKind = "ineligible" | "low_fit" | "broken_link";

export interface SetAsideItem {
  grant: GrantRecord;
  kind: SetAsideKind;
  reason: string;
}

const KIND_ORDER: Record<SetAsideKind, number> = { ineligible: 0, low_fit: 1, broken_link: 2 };

const BROKEN_LINK_NOTE = /^The link (looked|looks) broken/;

function shorten(text: string, max = 110): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Returns why a grant should be set aside, or null if it belongs in the main list. */
export function getSetAside(grant: GrantRecord): SetAsideItem | null {
  // Demo records and anything a person is already working on always stay in the main list.
  if (grant.is_demo_data) return null;
  if (grant.dashboard.staff_status !== "new" || grant.workflow.pipeline_stage !== "research") return null;

  if (grant.analysis.eligibility_status === "ineligible") {
    const failed = grant.requirements.find((r) => r.mandatory && r.determination === "fail");
    return {
      grant,
      kind: "ineligible",
      reason: failed ? `Not eligible: ${shorten(failed.requirement)}` : "Marked ineligible by the evaluation",
    };
  }

  const fit = grant.analysis.strategic_fit_percent;
  if (fit !== null && fit < MIN_FIT_PERCENT) {
    return { grant, kind: "low_fit", reason: `Low fit with Tech-Moms (${fit}%, cutoff ${MIN_FIT_PERCENT}%)` };
  }

  // A broken link on a grant nobody could evaluate leaves nothing to check.
  const isEvaluated = grant.data_quality.confidence === "page_read_by_gemini";
  if (!isEvaluated && grant.data_quality.notes.some((n) => BROKEN_LINK_NOTE.test(n))) {
    return { grant, kind: "broken_link", reason: "The funder link looks broken, so nothing could be checked" };
  }

  return null;
}

export function partitionGrants(grants: GrantRecord[]): { shown: GrantRecord[]; setAside: SetAsideItem[] } {
  const shown: GrantRecord[] = [];
  const setAside: SetAsideItem[] = [];
  for (const grant of grants) {
    const item = getSetAside(grant);
    if (item) setAside.push(item);
    else shown.push(grant);
  }
  setAside.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.grant.name.localeCompare(b.grant.name));
  return { shown, setAside };
}
