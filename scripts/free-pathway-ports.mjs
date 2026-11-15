#!/usr/bin/env node
/**
 * Free pathway local ports before `dev:pathway`.
 * Targets: Vite (5173) and pathway-server (8787).
 */
import { execSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const PORTS = [5173, 8787];

function pidsOnPort(port) {
  try {
    const out = execSync(`lsof -ti tcp:${port}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!out) return [];
    return [...new Set(out.split(/\s+/).filter(Boolean))];
  } catch {
    return [];
  }
}

function killPid(pid) {
  try {
    process.kill(Number(pid), "SIGTERM");
    return true;
  } catch {
    return false;
  }
}

const killed = [];
for (const port of PORTS) {
  for (const pid of pidsOnPort(port)) {
    if (killPid(pid)) killed.push(`${pid}@${port}`);
  }
}

if (killed.length) {
  await sleep(300);
  console.log(`[free-pathway-ports] freed: ${killed.join(", ")}`);
} else {
  console.log(`[free-pathway-ports] ports ${PORTS.join(", ")} already free`);
}
