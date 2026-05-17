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
with status pending or changed, applying any --filter. The plan it produces
records, per row, the planned action and the video's spoken language. Treat
that plan as the authoritative source for both.

2. Preflight the token. Call vimeo_whoami. If it returns an auth_scope error,
stop and tell the user to run /vimeo:setup. Do not attempt any rows.

3. For each candidate row, use the Scribe plugin's Drive tools to download the
file at drive_file_id into a local working directory under the plugin data
dir. Read its contents.

4. Compute the sha256 of the file contents. If it equals the row content_hash,
set the planned action to skip-unchanged.

5. Present the dry-run plan as a table. State how many videos and which
languages will be written. The user must explicitly approve that specific
plan in the same turn before any write begins. A general earlier yes is not
approval. Do not proceed without same-turn confirmation of this plan.

6. On approval, for each non-skipped row, decide the Vimeo type. Use the
spoken language already recorded in the reconcile plan from step 1; only if
the plan did not capture it, call vimeo_get_video once for that video. Use
captions when the row language matches the video's spoken language, otherwise
subtitles. Call vimeo_upsert_texttrack with videoId, type, language, optional
name, and the file contents (the raw VTT or SRT text).

7. Write the manifest row back via the Scribe plugin's Sheets tools.

   - skip-unchanged rows - set status skipped. Leave content_hash and
   last_synced_at unchanged. Do not upload.

   - successful upload - set status synced, content_hash to the new hash,
   last_synced_at to the current ISO 8601 timestamp, and the returned trackUri
   in notes.

   - failure - set status failed and write the error code and message into
   notes.

   Continue to the next row. Never abort the whole run on a single failure.

8. End by reporting to the user, in the final response and not only in the
manifest, the counts of synced, skipped-unchanged, and failed with per-row
reasons. If any row failed, state explicitly that the run completed with
failures. Never describe a run with any failure as clean.
