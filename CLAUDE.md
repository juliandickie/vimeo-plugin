# Vimeo Plugin - AI Agent Context File

## What This Plugin Does

Pushes Descript exports from Google Drive into the existing iDD Vimeo library.
Owns a bundled Node MCP server wrapping vimeo.js and skill prose. Delegates all
Google access to the Scribe plugin by capability reference. Shares the manifest
Google Sheet with the sibling Descript plugin as the only integration seam.

## Repo Layout Rules

Component dirs are at plugin root - skills, servers, hooks, scripts.
.claude-plugin holds only plugin.json. Use ${CLAUDE_PLUGIN_ROOT} for paths.
docs is gitignored and local-only by owner request - the design spec and plan
live there.

## Build and Test

Server is ESM Node. From servers/vimeo-mcp run npm test (node --test).
Deterministic logic is unit tested - errors, hash, status, texttracks. The
adapter and tools are tested with an injected fake client.

## Versioning

MAJOR breaking skill or tool changes, MINOR new skills or tools, PATCH fixes.
Update version in .claude-plugin/plugin.json before tagging.

## Scope

Phase 1 only - auth, engine, manifest, captions, metadata, source replace,
reconcile. Phase 2 is new-video upload. Phase 3 is folders and showcases. See
docs/superpowers/specs for the design spec.
