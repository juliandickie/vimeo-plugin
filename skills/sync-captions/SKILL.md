---
name: sync-captions
description: Apply multi-language caption and subtitle files from Google Drive to existing Vimeo videos, driven by the manifest. Idempotent. User-invoked only.
disable-model-invocation: true
argument-hint: "[--filter <substring>]"
---

# Vimeo - Sync Captions

The core Phase 1 workflow.

## Steps

1. Run the reconcile procedure (see skills/reconcile) scoped to caption rows
with status pending or changed, applying any --filter.

2. For each candidate row, use the Scribe plugin's Drive tools to download the
file at drive_file_id into a local working directory under the plugin data
dir. Read its contents.

3. Compute the sha256 of the file contents. If it equals the row content_hash,
set the planned action to skip-unchanged.

4. Present the dry-run plan as a table. State how many videos and which
languages will be written. The user must explicitly approve that specific
plan in the same turn before any write begins. A general earlier yes is not
approval. Do not proceed without same-turn confirmation of this plan.

5. On approval, for each non-skipped row, decide the Vimeo type. Use captions
when the row language matches the video's spoken language, otherwise
subtitles. The video's spoken language comes from the manifest row, or from
vimeo_get_video if the row does not state it. Call vimeo_upsert_texttrack with
videoId, type, language, optional name, and the file contents (the raw VTT or
SRT text).

6. On success, use the Scribe plugin's Sheets tools to update that manifest
row - status synced, content_hash to the new hash, last_synced_at to the
current ISO 8601 timestamp, and put the returned trackUri in notes. On
failure, set status failed and write the error code and message into notes.
Continue to the next row. Never abort the whole run on a single failure.

7. End by reporting to the user, in the final response and not only in the
manifest, the counts of synced, skipped-unchanged, and failed with per-row
reasons. If any row failed, state explicitly that the run completed with
failures. Never describe a run with any failure as clean.
