# Changelog

## 0.1.1

Fix - remove the redundant manifest.hooks reference to the auto-loaded
hooks/hooks.json. It caused a "Duplicate hooks file detected" load error at
session start. The SessionStart dependency-install hook is unaffected because it
still loads from the standard path.

## 0.1.0 - unreleased

Phase 1 - auth, Node MCP engine wrapping vimeo.js, Google Sheet manifest via
Scribe, multi-language caption sync, title and description sync, gated
destructive source replace, read-only reconcile.
