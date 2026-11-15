import type { PathwayResult, PlatformState } from "@wob/pathway-core";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data as T;
}

export function fetchPlatforms() {
  return request<{ platforms: PlatformState[]; testPostPrefix: string }>(
    "/api/platforms",
  );
}

export function saveCredentials(patch: Record<string, string>) {
  return request<{ ok: boolean; localKeys: string[] }>("/api/credentials", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export function verifyPlatform(input: {
  platformId: string;
  text: string;
  images: File[];
  dryRun?: boolean;
}) {
  const form = new FormData();
  form.append("text", input.text);
  if (input.dryRun) form.append("dryRun", "true");
  for (const file of input.images) {
    form.append("images", file);
  }
  return request<{ result: PathwayResult; platform: PlatformState }>(
    `/api/platforms/${input.platformId}/verify`,
    { method: "POST", body: form },
  );
}
