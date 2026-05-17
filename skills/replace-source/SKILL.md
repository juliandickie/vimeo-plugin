---
name: replace-source
description: Replace the source video file on an existing Vimeo video with a Drive file. Destructive, double-gated. User-invoked only.
disable-model-invocation: true
argument-hint: "[--filter <substring>]"
---

# Vimeo - Replace Source

Destructive. The Vimeo video keeps its ID and URL but the underlying file is
replaced via a new version. This skill never deletes anything and always
records the prior state first.

## Steps

1. Run the reconcile procedure scoped to source_video rows with status
pending or changed, applying any --filter. Exclude any row reconcile marked
blocked (a prior upload or transcode still in progress) - surface it in the
plan with that reason and do not attempt to replace it.

2. Preflight the token. Call vimeo_whoami. If it returns an auth_scope error,
stop and tell the user to run /vimeo:setup. Do not attempt any rows.

3. For each candidate, use the Scribe plugin's Drive tools to download the
replacement file at drive_file_id into the plugin data working dir. Compute
its sha256. If it equals the row content_hash, mark skip-unchanged - that row
will not be replaced.

4. Present the dry-run plan listing every video whose source would be
replaced and how many that is. The user must explicitly approve that specific
batch plan in the same turn before any change begins. A general earlier yes is
not approval.

5. For each approved non-skipped row, establish the recovery anchor before any
change.

   - If the row's prior_version_ref is already non-empty (a previous run
   recorded it, for example a retry after a partial failure), do not overwrite
   it. The existing value is the pointer to the genuine original source.
   Surface it to the user and ask them to confirm explicitly that this run
   should proceed keeping that original anchor. If they do not confirm, set
   the row status failed with reason "existing prior_version_ref needs manual
   review" and continue. Never silently overwrite a non-empty
   prior_version_ref - that would destroy the only pointer to the original.

   - Otherwise call vimeo_list_versions for that video. If it errors or
   returns no versions, do not replace that row - set status failed with
   reason "no recovery anchor available" and continue. Never destructively
   replace a video without a recorded prior version anchor.

   - Write the current (most recent) version's uri, filename, and
   created_time into the manifest prior_version_ref column via the Scribe
   plugin's Sheets tools. Then confirm that write succeeded. If the Sheets
   write returns any error, set the row status failed with reason
   "anchor write failed - cannot replace without a confirmed recovery record"
   and do not proceed to step 6 or step 7 for that row. The replace must
   never fire unless the anchor is durably written.

6. Immediately before the destructive call for a given video, ask for a
second explicit confirmation that names that specific vimeo_video_id and its
current title. If the user does not give an unambiguous yes for that named
video, do not replace it - set that row status skipped, append a note that it
was declined at the confirmation gate and that prior_version_ref was recorded
but no replace occurred, write that updated row to the manifest via the Scribe
plugin's Sheets tools, and continue to the next row. Never let a recorded
prior_version_ref imply a replace happened when it did not.

7. Call vimeo_replace_source with videoUri and the local filePath. Then poll
vimeo_get_upload_status every 30 seconds, up to 60 polls (about 30 minutes
total). Stop as soon as ready is true or failed is true. If 60 polls elapse
without ready or failed, treat the row as failed with reason "transcode
timeout - check Vimeo directly".

8. Write the manifest row back via the Scribe plugin's Sheets tools.

   - skip-unchanged rows - set status skipped. Leave content_hash,
   last_synced_at, and prior_version_ref exactly as they already are. Do not
   write the freshly computed hash back. No replace was performed.

   - declined at the step 6 gate - handled in step 6 (status skipped, note
   added, prior_version_ref left as recorded with the not-replaced note).

   - ready - set status synced, content_hash to the new hash, last_synced_at
   to the current ISO 8601 timestamp. Leave prior_version_ref as written in
   step 5 - do not clear it; it is the permanent record of what was replaced.

   - failed, upload_interrupted, or transcode timeout - set status failed with
   the reason (include the uploadStatus and transcodeStatus strings from
   vimeo_get_upload_status when available), leave prior_version_ref intact, and
   tell the user the original Vimeo source was not finalized over and the
   recorded prior_version_ref uri can be used to retrieve it.

   Continue to the next row. Never abort the whole run on a single failure.

9. End by reporting to the user, in the final response, the per-row outcomes
and the counts of synced, failed (with reasons), and skipped. Break the
skipped count into skip-unchanged versus declined-at-the-confirmation-gate so
the user can see which videos they declined. Never describe a run with any
failure as clean.
