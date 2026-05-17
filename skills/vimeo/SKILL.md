---
name: vimeo
description: Proactively activate when the user works with Vimeo videos in the context of the iDD library - (1) syncing captions or subtitles, (2) updating Vimeo title or description, (3) replacing a Vimeo source file, (4) reconciling a Drive to Vimeo manifest. Routes to the right /vimeo workflow and enforces safety.
---

# Vimeo - Router and Safety

This plugin pushes Descript exports from Google Drive into the existing iDD
Vimeo library. It owns a Vimeo MCP server and skill prose. It does not own
Google access.

## Routing

- Captions or subtitles to apply - direct the user to /vimeo:sync-captions

- Title or description changes - /vimeo:sync-metadata

- Replace the actual video file on an existing Vimeo video - /vimeo:replace-source

- A read-only check of manifest versus Vimeo - /vimeo:reconcile

- First run, token, or manifest setup - /vimeo:setup

All four push workflows are user-invoked only. Never trigger them from context.

## Cross-plugin composition

Google Drive and Google Sheets access is delegated to the Scribe plugin.
Reference it by capability, for example "use the Scribe plugin's Sheets tools
to read the manifest" and "use the Scribe plugin's Drive tools to download the
file". Never call Scribe tool namespaces directly in prose. If the Scribe
plugin is not available, stop and tell the user it is required.

The sibling Descript plugin writes export files to Drive and appends manifest
rows with status pending. This plugin only consumes the manifest. The two
plugins never call each other.

## Safety rules - always apply

1. Every push runs a reconcile and presents a per-row dry-run plan. Get
explicit user approval before any write.

2. Source replace is destructive. Require a second explicit confirmation that
names the specific video, and record the prior version reference to the
manifest before changing anything. Never delete.

3. Never report a clean success when any row failed. Always end with counts of
synced, skipped, and failed with reasons.

4. The content hash gate makes every workflow safe to re-run. Skip rows whose
hash is unchanged.
