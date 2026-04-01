#!/usr/bin/env bash
# Claude Buddy Reroller — One-Click Launcher (Mac/Linux)
# Usage: ./run.sh search --species duck --rarity legendary

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SCRIPT="$SCRIPT_DIR/buddy-reroll.mjs"

# Prefer Bun (100% accurate), fallback to Node.js
if command -v bun &>/dev/null; then
  exec bun "$SCRIPT" "$@"
elif command -v node &>/dev/null; then
  NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_VER" -lt 16 ]; then
    echo "❌ Node.js v16+ required (found v$NODE_VER)."
    echo "   Or install Bun: curl -fsSL https://bun.sh/install | bash"
    exit 1
  fi
  exec node "$SCRIPT" "$@"
else
  echo "❌ No JavaScript runtime found!"
  echo ""
  echo "Install one of:"
  echo "  Bun (recommended):  curl -fsSL https://bun.sh/install | bash"
  echo "  Node.js:            https://nodejs.org/"
  exit 1
fi
