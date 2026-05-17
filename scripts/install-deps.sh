#!/usr/bin/env bash
set -euo pipefail

# The MCP server runs from the persistent plugin data dir (see .mcp.json), so
# its source AND its node_modules must live there - not in the plugin root,
# which is read-only-ish, gitignores node_modules, and is replaced on update.
# This hook syncs the server source into the data dir and installs deps there.
SRC="${CLAUDE_PLUGIN_ROOT}/servers/vimeo-mcp"
DEST="${CLAUDE_PLUGIN_DATA:-$HOME/.claude/plugins/data/vimeo}/vimeo-mcp"

mkdir -p "$DEST/lib"

# Always sync the runtime source (not node_modules, not tests) so a plugin
# update is reflected on the next session start.
cp "$SRC/index.js" "$DEST/index.js"
cp "$SRC"/lib/*.js "$DEST/lib/"

# Install deps in DEST only when package.json or package-lock.json changed
# vs the DEST copies, or when node_modules is missing.
# npm ci requires the lockfile to be present and in sync with package.json.
if ! diff -q "$SRC/package.json" "$DEST/package.json" >/dev/null 2>&1 \
   || ! diff -q "$SRC/package-lock.json" "$DEST/package-lock.json" >/dev/null 2>&1 \
   || [ ! -d "$DEST/node_modules" ]; then
  cp "$SRC/package.json" "$DEST/package.json"
  cp "$SRC/package-lock.json" "$DEST/package-lock.json"
  ( cd "$DEST" && npm ci --omit=dev --ignore-scripts --silent ) || {
    rm -f "$DEST/package.json" "$DEST/package-lock.json"
    echo "vimeo-mcp dependency install failed; the Vimeo MCP server will be unavailable this session - re-open the session to retry" >&2
    exit 0
  }
fi
