#!/usr/bin/env bash
set -euo pipefail

# Install the bundled MCP server deps into the persistent plugin data dir,
# not the plugin root, so they survive plugin updates.
SRC="${CLAUDE_PLUGIN_ROOT}/servers/vimeo-mcp"
DEST="${CLAUDE_PLUGIN_DATA:-$HOME/.claude/plugins/data/vimeo}/vimeo-mcp"

mkdir -p "$DEST"
if ! diff -q "$SRC/package.json" "$DEST/package.json" >/dev/null 2>&1; then
  cp "$SRC/package.json" "$DEST/package.json"
  ( cd "$DEST" && npm install --omit=dev --silent ) || {
    rm -f "$DEST/package.json"
    echo "vimeo-mcp dependency install failed" >&2
    exit 0
  }
fi
