import type { AdapterContext } from "@wob/publish-core";
import { DATA_DIR, getEnv, serverConfig } from "./config.js";
import { loadCredentials, resolveCredentialMap } from "./store.js";

export function buildContext(): AdapterContext {
  const env = getEnv();
  const local = loadCredentials();
  return {
    env,
    credentials: resolveCredentialMap(env, local),
    dataDir: DATA_DIR,
    publicBaseUrl: serverConfig.publicBaseUrl,
    testPostPrefix: serverConfig.testPostPrefix,
  };
}
