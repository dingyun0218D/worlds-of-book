#!/usr/bin/env bash
# Idempotent local bootstrap for tools/AiToEarn:
# write JWT_SECRET / INTERNAL_TOKEN into config.yaml + .env, then docker compose up.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AITOEARN_DIR="${AITOEARN_DIR:-$ROOT/tools/AiToEarn}"
AI_CONFIG="$AITOEARN_DIR/project/aitoearn-backend/apps/aitoearn-ai/config/config.yaml"
SERVER_CONFIG="$AITOEARN_DIR/project/aitoearn-backend/apps/aitoearn-server/config/config.yaml"
ENV_FILE="$AITOEARN_DIR/.env"

die() {
  echo "error: $*" >&2
  exit 1
}

[[ -d "$AITOEARN_DIR" ]] || die "missing $AITOEARN_DIR — clone first: git clone https://github.com/yikart/AiToEarn.git tools/AiToEarn"
[[ -f "$AITOEARN_DIR/docker-compose.yml" ]] || die "missing $AITOEARN_DIR/docker-compose.yml"
[[ -f "$AI_CONFIG" ]] || die "missing $AI_CONFIG"
[[ -f "$SERVER_CONFIG" ]] || die "missing $SERVER_CONFIG"
command -v docker >/dev/null 2>&1 || die "docker not found"
docker compose version >/dev/null 2>&1 || die "docker compose not available"
command -v openssl >/dev/null 2>&1 || die "openssl not found"
command -v python3 >/dev/null 2>&1 || die "python3 not found"

read_env_jwt() {
  if [[ -f "$ENV_FILE" ]]; then
    # shellcheck disable=SC1090
    set -a
    # Only load JWT_SECRET if present; ignore other keys safely via grep extract
    local line
    line="$(grep -E '^[[:space:]]*JWT_SECRET=' "$ENV_FILE" | tail -n1 || true)"
    if [[ -n "$line" ]]; then
      printf '%s\n' "${line#JWT_SECRET=}" | sed 's/^["'\'']//; s/["'\'']$//'
    fi
  fi
}

read_yaml_auth() {
  local file="$1"
  python3 - "$file" <<'PY'
import re, sys
path = sys.argv[1]
text = open(path, encoding="utf-8").read()
secret = internal = None
in_auth = False
for line in text.splitlines():
    if re.match(r"^auth:\s*$", line):
        in_auth = True
        continue
    if in_auth:
        if re.match(r"^\S", line):
            in_auth = False
        else:
            m = re.match(r"^\s+secret:\s*(.*)$", line)
            if m:
                v = m.group(1).strip()
                if (v.startswith("'") and v.endswith("'")) or (v.startswith('"') and v.endswith('"')):
                    v = v[1:-1]
                secret = v
            m = re.match(r"^\s+internalToken:\s*(.*)$", line)
            if m:
                v = m.group(1).strip()
                if (v.startswith("'") and v.endswith("'")) or (v.startswith('"') and v.endswith('"')):
                    v = v[1:-1]
                internal = v
print(secret or "")
print(internal or "")
PY
}

write_configs() {
  local jwt="$1"
  local internal="$2"
  python3 - "$jwt" "$internal" "$AI_CONFIG" "$SERVER_CONFIG" <<'PY'
import re, sys

jwt, internal, ai_path, server_path = sys.argv[1:5]

def set_auth(text: str, secret: str, token: str) -> str:
    lines = text.splitlines(keepends=True)
    out = []
    in_auth = False
    for line in lines:
        if re.match(r"^auth:\s*$", line):
            in_auth = True
            out.append(line)
            continue
        if in_auth:
            if re.match(r"^\S", line):
                in_auth = False
            elif re.match(r"^\s+secret:\s*", line):
                indent = re.match(r"^(\s+)", line).group(1)
                out.append(f"{indent}secret: '{secret}'\n")
                continue
            elif re.match(r"^\s+internalToken:\s*", line):
                indent = re.match(r"^(\s+)", line).group(1)
                out.append(f"{indent}internalToken: '{token}'\n")
                continue
        out.append(line)
    return "".join(out)

def set_ai_client_token(text: str, token: str) -> str:
    lines = text.splitlines(keepends=True)
    out = []
    in_ai = False
    for line in lines:
        if re.match(r"^aiClient:\s*$", line):
            in_ai = True
            out.append(line)
            continue
        if in_ai:
            if re.match(r"^\S", line):
                in_ai = False
            elif re.match(r"^\s+token:\s*", line):
                indent = re.match(r"^(\s+)", line).group(1)
                out.append(f"{indent}token: '{token}'\n")
                continue
        out.append(line)
    return "".join(out)

ai = open(ai_path, encoding="utf-8").read()
server = open(server_path, encoding="utf-8").read()
ai = set_auth(ai, jwt, internal)
server = set_auth(server, jwt, internal)
server = set_ai_client_token(server, internal)
open(ai_path, "w", encoding="utf-8").write(ai)
open(server_path, "w", encoding="utf-8").write(server)
PY
}

write_env_jwt() {
  local jwt="$1"
  if [[ -f "$ENV_FILE" ]] && grep -qE '^[[:space:]]*JWT_SECRET=' "$ENV_FILE"; then
    python3 - "$ENV_FILE" "$jwt" <<'PY'
import re, sys
path, jwt = sys.argv[1], sys.argv[2]
text = open(path, encoding="utf-8").read()
if re.search(r"(?m)^\s*JWT_SECRET=", text):
    text = re.sub(r"(?m)^\s*JWT_SECRET=.*$", f"JWT_SECRET={jwt}", text, count=1)
else:
    if text and not text.endswith("\n"):
        text += "\n"
    text += f"JWT_SECRET={jwt}\n"
open(path, "w", encoding="utf-8").write(text)
PY
  else
    if [[ -f "$ENV_FILE" ]]; then
      printf '\nJWT_SECRET=%s\n' "$jwt" >>"$ENV_FILE"
    else
      printf 'JWT_SECRET=%s\n' "$jwt" >"$ENV_FILE"
    fi
  fi
}

# --- resolve secrets (prefer existing) ---
# Bash 3.2 compatible (macOS /bin/bash): avoid mapfile.
AI_SECRET=""
AI_INTERNAL=""
SERVER_SECRET=""
SERVER_INTERNAL=""
{
  IFS= read -r AI_SECRET || true
  IFS= read -r AI_INTERNAL || true
} < <(read_yaml_auth "$AI_CONFIG")
{
  IFS= read -r SERVER_SECRET || true
  IFS= read -r SERVER_INTERNAL || true
} < <(read_yaml_auth "$SERVER_CONFIG")
ENV_JWT="$(read_env_jwt || true)"

JWT_SECRET=""
INTERNAL_TOKEN=""

for candidate in "$ENV_JWT" "$AI_SECRET" "$SERVER_SECRET"; do
  if [[ -n "${candidate:-}" ]]; then
    JWT_SECRET="$candidate"
    break
  fi
done

for candidate in "$AI_INTERNAL" "$SERVER_INTERNAL"; do
  if [[ -n "${candidate:-}" ]]; then
    INTERNAL_TOKEN="$candidate"
    break
  fi
done

if [[ -z "$JWT_SECRET" ]]; then
  JWT_SECRET="$(openssl rand -hex 32)"
  echo "generated JWT_SECRET"
else
  echo "reusing existing JWT_SECRET"
fi

if [[ -z "$INTERNAL_TOKEN" ]]; then
  INTERNAL_TOKEN="$(openssl rand -hex 32)"
  echo "generated INTERNAL_TOKEN"
else
  echo "reusing existing INTERNAL_TOKEN"
fi

write_configs "$JWT_SECRET" "$INTERNAL_TOKEN"
write_env_jwt "$JWT_SECRET"
echo "wrote auth secrets to config.yaml files and .env"

cd "$AITOEARN_DIR"
echo "running docker compose up -d in $AITOEARN_DIR"
docker compose up -d
echo
docker compose ps
echo
echo "open http://localhost:8080 when services are healthy"
