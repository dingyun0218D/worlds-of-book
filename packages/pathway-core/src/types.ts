export type PlatformId =
  | "douyin"
  | "x"
  | "facebook"
  | "instagram"
  | "tiktok";

export type PathwayMode = "official_api" | "semi_auto" | "unavailable";

export type PathwayStatus =
  | "unconfigured"
  | "configured_unverified"
  | "pathway_ok"
  | "semi_auto_ok"
  | "unavailable";

export type StepStatus = "pending" | "running" | "ok" | "failed" | "skipped";

export interface PathwayStep {
  id: string;
  label: string;
  status: StepStatus;
  detail?: string;
  at?: string;
}

export interface PathwayResult {
  platformId: PlatformId;
  ok: boolean;
  status: PathwayStatus;
  mode: PathwayMode;
  message: string;
  postUrl?: string;
  externalId?: string;
  steps: PathwayStep[];
  errorCode?: string;
  startedAt: string;
  finishedAt: string;
}

export interface PlatformMeta {
  id: PlatformId;
  name: string;
  nameEn: string;
  mode: PathwayMode;
  description: string;
  credentialFields: CredentialField[];
  docsUrl?: string;
}

export interface CredentialField {
  key: string;
  label: string;
  secret?: boolean;
  required?: boolean;
  placeholder?: string;
  help?: string;
}

export interface PlatformState {
  platformId: PlatformId;
  meta: PlatformMeta;
  status: PathwayStatus;
  configured: boolean;
  lastResult?: PathwayResult;
  missingFields: string[];
  notes: string[];
}

export interface PublishPayload {
  text: string;
  imagePaths: string[];
  dryRun?: boolean;
}

export interface AdapterContext {
  env: Record<string, string | undefined>;
  credentials: Record<string, string>;
  dataDir: string;
  publicBaseUrl: string;
  testPostPrefix: string;
}

export interface PathwayAdapter {
  meta: PlatformMeta;
  getMissingFields(ctx: AdapterContext): string[];
  getStatus(ctx: AdapterContext): Promise<PlatformState>;
  verifyPublish(ctx: AdapterContext, payload: PublishPayload): Promise<PathwayResult>;
}
