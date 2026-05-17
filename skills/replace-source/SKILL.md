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
pending or changed, applying any --filter.

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

5. For each approved non-skipped row, before any change, call vimeo_get_video
and write the prior version reference (the Vimeo video id plus the current
version uri returned by vimeo_get_video) into the manifest column
prior_version_ref via the Scribe plugin's Sheets tools. This is the
archive-over-delete record and must be written before the replace call.

6. Immediately before the destructive call for a given video, ask for a
second explicit confirmation that names that specific vimeo_video_id and its
current title. Proceed only on an unambiguous yes for that named video.

7. Call vimeo_replace_source with videoUri and the local filePath. Then poll
vimeo_get_upload_status until ready true or failed true.

8. Write the manifest row back via the Scribe plugin's Sheets tools.

   - skip-unchanged rows - set status skipped. Leave content_hash,
   last_synced_at, and prior_version_ref unchanged. No replace was performed.

   - ready - set status synced, content_hash to the new hash, last_synced_at
   to the current ISO 8601 timestamp.

   - failed or upload_interrupted - set status failed with the reason
   (include the uploadStatus and transcodeStatus strings from
   vimeo_get_upload_status), leave prior_version_ref intact, and tell the user
   the original Vimeo source was not finalized over.

   Continue to the next row. Never abort the whole run on a single failure.

9. End by reporting to the user, in the final response, the per-row outcomes
and the counts of synced, skipped, and failed with reasons. Never describe a
run with any failure as clean.
