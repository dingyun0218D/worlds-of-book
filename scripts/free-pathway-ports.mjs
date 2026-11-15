#!/usr/bin/env node
/**
 * Free pathway local listen ports (default: 5173 Vite, 8787 API).
 * Retries with SIGTERM then SIGKILL until the port is free.
 *
 * Usage:
 *   node scripts/free-pathway-ports.mjs
 *   node scripts/free-pathway-ports.mjs --ports=5173
 *   node scripts/free-pathway-ports.mjs --ports=5173,8787
 */
import { execSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

function parsePorts(argv) {
  const flag = argv.find((a) => a.startsWith("--ports="));
  if (!flag) return [5173, 8787];
  return flag
    .slice("--ports=".length)
    .split(",")
    .map((p) => Number(p.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
}

const PORTS = parsePorts(process.argv.slice(2));
const MAX_ROUNDS = 12;
const ROUND_WAIT_MS = 250;

function listenPids(port) {
  try {
    // Only LISTEN owners — avoid killing unrelated client sockets.
    const out = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!out) return [];
    return [...new Set(out.split(/\s+/).filter(Boolean))];
  } catch {
    return [];
  }
}

function killPid(pid, signal) {
  try {
    process.kill(Number(pid), signal);
    return true;
  } catch {
    return false;
  }
}

async function freePort(port) {
  const actions = [];
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const pids = listenPids(port);
    if (pids.length === 0) return actions;

    const signal = round < 3 ? "SIGTERM" : "SIGKILL";
    for (const pid of pids) {
      if (killPid(pid, signal)) {
        actions.push(`${pid}@${port}/${signal}`);
      }
    }
    await sleep(ROUND_WAIT_MS);
  }

  const leftover = listenPids(port);
  if (leftover.length) {
    throw new Error(
      `port ${port} still in use by pid(s) ${leftover.join(", ")} after ${MAX_ROUNDS} kill rounds`,
    );
  }
  return actions;
}

const allActions = [];
for (const port of PORTS) {
  allActions.push(...(await freePort(port)));
}

if (allActions.length) {
  console.log(`[free-pathway-ports] freed: ${allActions.join(", ")}`);
} else {
  console.log(`[free-pathway-ports] ports ${PORTS.join(", ")} already free`);
}
