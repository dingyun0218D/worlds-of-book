import type {
  PathwayMode,
  PathwayResult,
  PathwayStatus,
  PathwayStep,
  PlatformId,
  StepStatus,
} from "./types.js";

export function nowIso(): string {
  return new Date().toISOString();
}

export function createStep(
  id: string,
  label: string,
  status: StepStatus = "pending",
  detail?: string,
): PathwayStep {
  return {
    id,
    label,
    status,
    detail,
    at: status === "pending" ? undefined : nowIso(),
  };
}

export function markStep(
  steps: PathwayStep[],
  id: string,
  status: StepStatus,
  detail?: string,
): PathwayStep[] {
  return steps.map((step) =>
    step.id === id
      ? {
          ...step,
          status,
          detail: detail ?? step.detail,
          at: nowIso(),
        }
      : step,
  );
}

export function finishResult(input: {
  platformId: PlatformId;
  ok: boolean;
  status: PathwayStatus;
  mode: PathwayMode;
  message: string;
  steps: PathwayStep[];
  startedAt: string;
  postUrl?: string;
  externalId?: string;
  errorCode?: string;
}): PathwayResult {
  return {
    ...input,
    finishedAt: nowIso(),
  };
}
