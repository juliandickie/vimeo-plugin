---
name: reconcile
description: Read-only audit of the Drive to Vimeo manifest against actual Vimeo state. Produces the dry-run plan that every push workflow reuses. No writes.
disable-model-invocation: true
argument-hint: "[--filter <substring>]"
---

# Vimeo - Reconcile and Dry Run

Read-only. Never writes to Vimeo or the manifest. This is the canonical
planning procedure. It is user-invokable as /vimeo:reconcile and is not
auto-triggered from ambient context. The push skills (/vimeo:sync-captions,
/vimeo:sync-metadata, /vimeo:replace-source) reuse it by following these same
steps as prose to build the plan they ask the user to approve. The
disable-model-invocation flag only stops ambient auto-activation; it does not
stop a push skill from following this documented procedure.

## Manifest status meanings

- pending - the row was inserted (by the Descript plugin or by hand) and has
never been synced.

- changed - the row was synced before but the Drive source content hash now
differs, so it needs re-syncing.

- synced, skipped, failed - terminal states from a prior run, not selected by
default.

## Steps

1. Read the manifest using the Scribe plugin's Sheets tools. If the manifest
Sheet ID is not configured, tell the user to run /vimeo:setup first and stop.

2. Select rows. Default to status pending or changed. If the user passed
--filter, keep only rows whose drive_file_name, vimeo_video_id, or asset_type
contains the substring.

3. For each selected row, without downloading large files where avoidable -

   - caption rows - call vimeo_list_texttracks for the vimeo_video_id and
   decide whether the target language would create or replace. Determine the
   video's spoken language from the manifest row, or from vimeo_get_video if
   the row does not state it, and record it in the plan so the push skill
   assigns the correct captions or subtitles type without a second lookup.

   - metadata rows - call vimeo_get_video and show the current name and
   description versus the manifest intent.

   - source_video rows - call vimeo_get_video (also surface its spoken
   language for any sibling caption rows on the same video) and
   vimeo_get_upload_status. The status call is informational pre-flight only.
   If it shows a prior upload or transcode still in progress, mark the row
   blocked rather than replace-source.

4. Present a per-row table - row_id, asset_type, vimeo_video_id, language,
planned action (create, replace, update, replace-source, skip-unchanged,
blocked), and any detected problem (video not found, auth_scope, prior upload
in progress, etc).

5. End with totals. Make clear this was read-only and that nothing changed.

This skill is the planning half. The push skills follow this same procedure to
build the plan they ask the user to approve.
