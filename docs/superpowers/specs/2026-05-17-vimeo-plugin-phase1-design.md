# Vimeo Plugin - Phase 1 Design Spec

Created 2026-05-17. Status - approved design, ready for implementation planning. Authoring context - brainstormed with Julian (iDD, Pro Marketing). This spec covers Phase 1 only. Phases 2 and 3 are scoped at the end as explicit out-of-scope follow-ups.

## 1. Problem statement

iDD has a large existing video library in Vimeo. Content is edited and exported from Descript, including subtitle and caption files, sometimes in many languages. Those exports land in Google Drive. There is currently no programmatic path to push that Drive content into the correct existing Vimeo videos, and no durable record of which Drive file maps to which Vimeo video. The work is manual, error prone, and does not scale across a 14 person team.

This plugin gives Claude Code a controlled, auditable, repeatable way to take Descript outputs out of Google Drive and apply them to the right Vimeo videos, with a persistent manifest that survives across sessions and team members.

## 2. Pipeline context

This plugin is one stage in a pipeline of independently built plugins.

```
Descript
   │  edit + (later) translate
   ▼
Descript plugin (sibling, built separately)
   │  triggers Descript translate + export, saves files to Google Drive,
   │  appends manifest rows with status pending
   ▼
Google Drive
   │  Scribe plugin provides Drive download + Sheets read/write
   ▼
Vimeo plugin (THIS PROJECT)
   │  reads pending manifest rows, downloads Drive files via Scribe,
   │  pushes to Vimeo, writes status back to the manifest
   ▼
Vimeo library
```

Key principle - the Descript plugin and the Vimeo plugin never call each other and never import each other's tools. They meet at one authoritative seam - the manifest Google Sheet. The manifest carries explicit drive_file_id and drive_folder_id values per row, so no separate folder-naming convention is part of the contract. Drive folder organization is an operator convenience only, never something either plugin parses. This keeps both plugins independently versionable, which is the documented cross-plugin composition pattern in the plugin-dev master authority document and the meta-orchestrator concept doc.

## 3. Scope

### In scope for Phase 1

- Vimeo authentication via a personal access token with the required scopes.

- A bundled Node MCP server that wraps the official vimeo.js library and exposes a thin set of Vimeo tools.

- A persistent manifest in a Google Sheet, read and written through the Scribe plugin, mapping Drive files and folders to Vimeo videos and folders.

- Drive ingestion of Descript export files through the Scribe plugin.

- Multi-language caption and subtitle (text track) upload and update on existing Vimeo videos.

- Title and description metadata sync on existing Vimeo videos.

- Destructive replacement of the source video file on an existing Vimeo video, using Vimeo's versions endpoint and resumable upload, behind a double-confirmation gate with a prior-version backup record.

- A read-only reconcile and dry-run preview shared by every push workflow.

### Out of scope for Phase 1 (later phases)

- Phase 2 - uploading brand new videos that do not yet exist in Vimeo (new resumable upload, folder placement on create).

- Phase 3 - library organization, folders and showcases management, bulk reorganization, manifest-driven reconciliation reports beyond the Phase 1 read-only audit.

- Translation of subtitles. Translation is the Descript plugin's responsibility. This plugin only consumes finished caption files from Drive.

- Authentication against any service other than Vimeo. Google access is delegated entirely to the Scribe plugin.

- Scheduling or background execution. Workflows run on demand when the user invokes the slash command.

## 4. Decisions and rationale

### 4.1 Engine - bundled Node MCP server wrapping vimeo.js

This directly answers the study question "which of the four Vimeo repos is best for this purpose". The four cloned reference repos under docs/ were surveyed.

- vimeo.php - most recently maintained (last commit 2025-10-23) and has an explicit upload_texttrack.php example. Rejected because bundling a PHP runtime inside a Claude Code plugin is the heaviest option and the least aligned with the Node tooling norm used across the plugin ecosystem.

- vimeo.py - rejected. It is the stalest official library (last commit 2024-05-13) and there is no existing Vimeo PyPI MCP server to pin, so the Python path would add packaging overhead for the weakest library.

- openapi - the api.yaml spec is stale (last commit 2023-12-13). Kept as the endpoint-truth reference for exact request and response shapes, not used as the engine.

- vimeo.js - chosen. Last commit 2025-04-30, actively maintained, ships two text track examples (upload_texttrack.js and the promise variant), and imports tus-js-client with a first-class resumable upload path (Vimeo.prototype.upload runs approach tus via _performTusUpload). Node is universally available, MCP tools stay composable for later phases and cross-plugin orchestration, and this matches the documented standard pattern of a plugin shipping its own MCP server.

Grounded verification performed during design - vimeo.js/lib/vimeo.js line 24 imports tus-js-client, the upload method sets approach tus, and filestreamer.js handles HTTP 308 range resume for the text track file stream. Honest caveat carried into this spec - vimeo.js has no canned versions or replace example. Source replace uses Vimeo's POST /videos/{video_id}/versions endpoint composed with the same tus uploader. The machinery exists in the library; the replace path carries more implementation risk than captions and is deliberately isolated in a single MCP tool with its own test surface so the risk does not bleed into the caption path.

### 4.2 Auth - long-lived personal access token, not 3-legged OAuth

This is a single-account back-office pipeline owned by iDD, not a multi-tenant app. A Vimeo personal access token generated in the Vimeo developer app, with scopes public, private, edit, upload, and video_files, is the least-friction correct choice. The token is entered once through plugin userConfig with sensitive true and injected as an environment variable into the MCP server. The upload and video_files scopes are required for the source-replace path; the setup workflow verifies all scopes are present before any write.

### 4.3 Manifest - a Google Sheet read and written via Scribe

The user explicitly wants a record that can be referenced across multiple sessions and keeps Drive file or folder IDs alongside the connecting Vimeo IDs or Vimeo folder IDs. A Google Sheet is the natural fit - persistent, team-visible, auditable, and it doubles as the integration contract between the Descript plugin and this plugin. The Sheet is accessed only through Scribe's Sheets tools via prose hints, never by importing Scribe's tools directly.

Setup behavior is locked - /vimeo:setup creates the manifest Sheet if no configured Sheet ID is present, otherwise it uses the configured Sheet ID. This was the one open question at design time and is now resolved as create-if-absent-else-use-configured.

## 5. Architecture

```
/vimeo:* skills (router + workflow skills)
        │  prose hints only, no direct tool imports
        ├───────────────► Scribe plugin   Drive download + Sheets manifest read/write
        │
        ▼
Vimeo MCP server (Node, bundled under servers/vimeo-mcp/, wraps vimeo.js)
        │  VIMEO_ACCESS_TOKEN injected from userConfig (sensitive)
        ▼
Vimeo API   text tracks, video metadata, /videos/{id}/versions resumable upload
```

The plugin owns the MCP server and the skill prose. It does not own Google access. It composes Scribe for Drive and Sheets. It shares a manifest and Drive folder convention with the Descript plugin.

## 6. Component detail

### 6.1 Manifest schema

One row per asset. The Sheet has a single header row. Columns -

| Column | Meaning |
|---|---|
| row_id | Stable unique key for the row, generated on insert |
| asset_type | One of caption, metadata, source_video |
| drive_file_id | Google Drive file ID of the source asset (blank for metadata-only rows) |
| drive_file_name | Human readable Drive file name for auditability |
| drive_folder_id | Google Drive folder ID the asset came from |
| vimeo_video_id | Target Vimeo video ID |
| vimeo_folder_id | Target Vimeo folder ID, informational in Phase 1 |
| language | BCP 47 language code for caption rows, blank otherwise |
| content_hash | Hash of the downloaded file content, used for idempotency |
| status | One of pending, changed, synced, failed, skipped |
| last_synced_at | ISO 8601 timestamp of the last successful sync |
| prior_version_ref | For source_video rows, a reference to the pre-replacement Vimeo version, written before any replace |
| notes | Free text, failure reasons and operator notes |

Status lifecycle - the Descript plugin or an operator inserts rows with status pending. This plugin moves pending or changed to synced on success, to failed on error with a reason in notes, or to skipped when the content hash matches the last sync.

### 6.2 MCP server tool contract

The server is thin. Workflow logic lives in skills, not in the server. Tools -

- vimeo_whoami - returns the authenticated account and the granted scopes. Used as a precondition check by setup and by every write workflow.

- vimeo_get_video - fetches a video's current metadata and existing text track list for planning and reconcile.

- vimeo_update_video_metadata - updates title and description on an existing video.

- vimeo_list_texttracks - lists text tracks for a video, including language and type.

- vimeo_upsert_texttrack - creates a text track for a language, or replaces the existing track for that language. Encapsulates the create-record then resumable-file-stream flow.

- vimeo_delete_texttrack - removes a text track, used only when a workflow explicitly reconciles a removed language.

- vimeo_replace_source - creates a new version on an existing video and drives the resumable upload of the replacement file. The single highest-risk tool, isolated here with its own tests.

- vimeo_get_upload_status - polls Vimeo transcode and availability status after an upload or a replace.

Every tool returns structured success or a typed error that names the failure class - auth_scope, rate_limited, transient, not_found, upload_interrupted, or invalid_input - so skills can react and report precisely.

### 6.3 Cross-plugin composition contract

- This plugin to Scribe - skill prose references "the Scribe plugin's Drive tools" and "the Scribe plugin's Sheets tools" by capability, never by tool namespace. Robust to Scribe internal renames.

- Descript plugin to this plugin - the contract is the manifest Sheet alone. The Descript plugin writes export files to Drive and appends manifest rows with asset_type, drive_file_id, drive_folder_id, target vimeo_video_id, language, and status pending. This plugin consumes rows with status pending or changed and never infers anything from Drive folder names. Neither plugin imports the other. This contract is documented here so the Descript plugin can be built against it independently.

## 7. Workflow skills

All side-effecting workflow skills carry disable-model-invocation true. They run only when the user types the command, never by auto-trigger. This matches both the plugin-dev best practice for high-risk workflows and the user's standing preference for a scope check-in before batched external changes.

- skills/vimeo/SKILL.md - auto-activating router. Holds safety rules, the Scribe and Descript composition prose, and routing logic. Not invocation-disabled, not user-invocable-only.

- skills/vimeo-api/SKILL.md - background knowledge of the MCP tools and Vimeo endpoint semantics, including the texttracks flow and the versions replace flow. user-invocable false, auto-activates when Vimeo work is in scope.

- skills/setup/SKILL.md - /vimeo:setup. Walks personal access token creation, verifies scopes via vimeo_whoami, and creates the manifest Sheet if no configured Sheet ID exists else uses the configured ID. disable-model-invocation true.

- skills/sync-captions/SKILL.md - /vimeo:sync-captions. The core multi-language caption pipeline. disable-model-invocation true.

- skills/sync-metadata/SKILL.md - /vimeo:sync-metadata. Title and description sync. disable-model-invocation true.

- skills/replace-source/SKILL.md - /vimeo:replace-source. Destructive source file replace, double-confirmation gate, prior-version backup written first. disable-model-invocation true.

- skills/reconcile/SKILL.md - /vimeo:reconcile. Read-only manifest versus Vimeo audit and the shared dry-run preview engine used by every push skill.

## 8. Data flow

### 8.1 sync-captions, the core path

1. Read the manifest Sheet via Scribe.

2. For each caption row with status pending or changed, resolve and download the Drive file via Scribe into a working directory under the plugin data path.

3. Hash the downloaded file, compare to the manifest content_hash, and mark skipped if unchanged. This makes re-runs safe and idempotent.

4. Build a dry-run plan keyed by vimeo_video_id and language, each entry marked create or replace based on vimeo_list_texttracks. Present the plan and require explicit approval.

5. On approval, call vimeo_upsert_texttrack per planned row.

6. Write back to the manifest - status synced, new content_hash, last_synced_at, and the resulting text track id in notes.

7. Emit a run summary - counts of synced, skipped-unchanged, and failed with per-row reasons. Partial success is reported loudly. The run is never described as a clean success if any row failed.

### 8.2 replace-source, the high-risk path

1. Read the manifest Sheet via Scribe and select source_video rows with status pending or changed.

2. Download the replacement file via Scribe, hash it, and skip if unchanged.

3. Build a dry-run plan listing each video that would have its source replaced. Present the plan and require a first explicit approval.

4. For each approved row, write prior_version_ref to the manifest by reading the current Vimeo version reference before any change. Archive over delete - nothing is removed.

5. Require a second explicit confirmation immediately before the destructive call, naming the specific video.

6. Call vimeo_replace_source, which creates a new version and drives the resumable tus upload with resume on interruption.

7. Poll vimeo_get_upload_status until Vimeo reports the new source available, then write status synced with timestamp. On unrecoverable failure, leave the original Vimeo source untouched, set status failed with the reason, and do not finalize a partial version.

## 9. Safety and approval model

- Every push workflow runs reconcile first and presents a per-row dry-run plan that the user must explicitly approve. No batched external change happens without a scope check-in.

- All side-effecting workflows are disable-model-invocation true, so Claude never triggers them from context. They are user-typed only.

- Source replace is gated twice and never deletes. The prior version reference is recorded in the manifest before any change.

- Failure handling is fail-loud. Per-row continue, an explicit failure list, and completed-with-N-failures wording whenever the run is not perfectly clean.

## 10. Error handling and idempotency

- Token or scope failure surfaces the exact missing scope and points the user at /vimeo:setup.

- Transient Vimeo 5xx and rate limit responses get bounded exponential backoff inside the MCP server. Exhausted retries surface a clear typed failure.

- Interrupted uploads resume via tus from the last offset. An unrecoverable replace leaves the original Vimeo source intact.

- The content_hash gate guarantees re-running any workflow is safe and only acts on genuinely changed assets.

## 11. Testing strategy

- MCP server unit tests against a mocked Vimeo API covering the texttrack create branch, the texttrack replace branch, metadata update, and the higher-risk replace-source version-plus-resume path including a simulated mid-upload interruption and resume.

- A dry-run mode that exercises the full workflow path with no Vimeo writes, used both as the user-facing preview and as an integration smoke test.

- Scribe Drive and Sheets reads stubbed with fixtures so the plugin's workflow logic is testable without Scribe installed.

- One documented manual end-to-end run against a disposable Vimeo test video, configured via userConfig, not in CI.

## 12. Repo structure

```
vimeo-plugin/
  .claude-plugin/plugin.json
  .mcp.json
  skills/vimeo/SKILL.md
  skills/vimeo-api/SKILL.md
  skills/setup/SKILL.md
  skills/sync-captions/SKILL.md
  skills/sync-metadata/SKILL.md
  skills/replace-source/SKILL.md
  skills/reconcile/SKILL.md
  servers/vimeo-mcp/index.js
  servers/vimeo-mcp/package.json
  servers/vimeo-mcp/lib/
  hooks/hooks.json
  scripts/install-deps.sh
  docs/superpowers/specs/
  docs/manifest-schema.md
  docs/vimeo.js  docs/vimeo.php  docs/vimeo.py  docs/openapi   reference clones, gitignored
  tests/
  CLAUDE.md
  README.md
  CHANGELOG.md
  LICENSE
  .gitignore
```

The four cloned reference repos carry their own .git directories. The .gitignore excludes them, along with node_modules and .DS_Store, so this repo's history stays clean and there are no nested-repo problems. The MCP server's Node dependencies are installed via a SessionStart hook into the persistent plugin data path, never into the plugin root.

## 13. Configuration

plugin.json userConfig fields -

- vimeo_access_token - string, sensitive true, required. The Vimeo personal access token.

- manifest_sheet_id - string, optional. If present, setup uses this Sheet. If absent, setup creates a new manifest Sheet via Scribe and records the resulting ID for the user to save into config.

- vimeo_test_video_id - string, optional. A disposable video ID used only by the documented manual end-to-end test.

.mcp.json declares the vimeo server with command node, args pointing at the bundled server via the plugin root variable, and the access token passed through from userConfig as an environment variable.

## 14. Success criteria for Phase 1

- A team member can run /vimeo:setup once and reach a verified authenticated state with a working manifest Sheet.

- Running /vimeo:sync-captions applies multi-language caption files from Drive to the correct existing Vimeo videos, is idempotent on re-run, and writes accurate status back to the manifest.

- Running /vimeo:sync-metadata updates title and description on the targeted videos.

- Running /vimeo:replace-source replaces a source file on an existing Vimeo video behind two confirmations, records the prior version first, and never destroys the original on failure.

- /vimeo:reconcile gives a truthful read-only diff of manifest versus Vimeo with no writes.

- The plugin never auto-triggers a side-effecting workflow and never reports a clean success when any row failed.

## 15. References

- Cloned reference libraries under docs/ - vimeo.js (chosen engine), vimeo.php, vimeo.py, openapi (endpoint truth).

- Plugin-dev master authority document - /Users/juliandickie/code/plugin-dev/docs/Claude Code Plugin Marketplace - Master Authority Document v2.md.

- Cross-plugin composition pattern - /Users/juliandickie/code/plugin-dev/docs/2026-05-15-meta-orchestrator-concept.md.

- Scribe plugin (composed for Drive and Sheets) - /Users/juliandickie/code/scribe-plugin.

- Descript plugin (sibling, shares the manifest and Drive folder contract) - /Users/juliandickie/code/descript-plugin.
