#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

if [ -z "${SSH_PRIVATE_KEY:-}" ] || [ -z "${SSH_HOST:-}" ] || [ -z "${SSH_USER:-}" ]; then
  echo "[session-start] SSH_PRIVATE_KEY / SSH_HOST / SSH_USER not set; skipping SSH setup." >&2
  exit 0
fi

if ! command -v ssh >/dev/null 2>&1; then
  echo "[session-start] installing openssh-client..." >&2
  if command -v sudo >/dev/null 2>&1; then
    sudo apt-get update -qq && sudo apt-get install -y -qq openssh-client >/dev/null
  else
    apt-get update -qq && apt-get install -y -qq openssh-client >/dev/null
  fi
fi

mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"

KEY_FILE="$HOME/.ssh/claude_remote"
printf '%s\n' "$SSH_PRIVATE_KEY" > "$KEY_FILE"
chmod 600 "$KEY_FILE"

HOST_ALIAS="${SSH_HOST_ALIAS:-myserver}"
PORT="${SSH_PORT:-22}"

CONFIG_FILE="$HOME/.ssh/config"
touch "$CONFIG_FILE"
chmod 600 "$CONFIG_FILE"

if ! grep -q "^Host ${HOST_ALIAS}\$" "$CONFIG_FILE" 2>/dev/null; then
  cat >> "$CONFIG_FILE" <<EOF

Host ${HOST_ALIAS}
    HostName ${SSH_HOST}
    User ${SSH_USER}
    Port ${PORT}
    IdentityFile ${KEY_FILE}
    IdentitiesOnly yes
    StrictHostKeyChecking ${SSH_STRICT_HOST_KEY_CHECKING:-accept-new}
    UserKnownHostsFile ${HOME}/.ssh/known_hosts
EOF
fi

if [ -n "${SSH_KNOWN_HOSTS:-}" ]; then
  touch "$HOME/.ssh/known_hosts"
  chmod 600 "$HOME/.ssh/known_hosts"
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    grep -qxF "$line" "$HOME/.ssh/known_hosts" || echo "$line" >> "$HOME/.ssh/known_hosts"
  done <<< "$SSH_KNOWN_HOSTS"
fi

echo "[session-start] SSH configured. Try: ssh ${HOST_ALIAS}" >&2
