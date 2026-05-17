---
name: reconcile
description: Read-only audit of the Drive to Vimeo manifest against actual Vimeo state. Produces the dry-run plan that every push workflow reuses. No writes.
disable-model-invocation: true
argument-hint: "[--filter <substring>]"
---

# Vimeo - Reconcile and Dry Run

Read-only. Never writes to Vimeo or the manifest.

## Steps

1. Read the manifest using the Scribe plugin's Sheets tools. If the manifest
Sheet ID is not configured, tell the user to run /vimeo:setup first and stop.

2. Select rows. Default to status pending or changed. If the user passed
--filter, keep only rows whose drive_file_name or vimeo_video_id contains the
substring.

3. For each selected row, without downloading large files where avoidable -

   - caption rows - call vimeo_list_texttracks for the vimeo_video_id and
   decide whether the target language would create or replace.

   - metadata rows - call vimeo_get_video and show the current name and
   description versus the manifest intent.

   - source_video rows - call vimeo_get_video and vimeo_get_upload_status and
   mark that a destructive replace would occur.

4. Present a per-row table - row_id, asset_type, vimeo_video_id, language,
planned action (create, replace, update, replace-source, skip-unchanged), and
any detected problem (video not found, auth_scope, etc).

5. End with totals. Make clear this was read-only and that nothing changed.

This skill is the planning half. The push skills call this same procedure to
build the plan they ask the user to approve.
