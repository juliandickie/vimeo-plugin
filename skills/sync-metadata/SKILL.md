---
name: sync-metadata
description: Update Vimeo video title and description from the manifest. User-invoked only.
disable-model-invocation: true
argument-hint: "[--filter <substring>]"
---

# Vimeo - Sync Metadata

## Steps

1. Run the reconcile procedure scoped to metadata rows with status pending or
changed, applying any --filter.

2. Preflight the token. Call vimeo_whoami. If it returns an auth_scope error,
stop and tell the user to run /vimeo:setup. Do not attempt any rows.

3. The intended title and description always come from the row's
drive_file_id, never from the notes column (notes is output only). Use the
Scribe plugin's Drive tools to read that Drive doc. The first non-empty line
of the doc is the intended title. The text after the first blank line is the
intended description. If there is no text after the first blank line, update
the title only. If the Drive doc cannot be read or yields no title, set that
row status failed with the reason and skip it - do not write empty metadata to
Vimeo.

4. Build the per-row plan - show current Vimeo name and description versus
intended. Compute a sha256 over the resolved title text concatenated with the
resolved description text (the actual content read from the Drive doc, not the
doc id) for the idempotency hash. Mark skip-unchanged when it equals the row
content_hash.

5. Present the plan. State how many videos will be changed. The user must
explicitly approve that specific plan in the same turn before any write
begins. A general earlier yes is not approval.

6. On approval, call vimeo_update_video_metadata with videoId and the changed
fields only.

7. Write the manifest row back via the Scribe plugin's Sheets tools.

   - skip-unchanged rows - set status skipped. Leave content_hash and
   last_synced_at unchanged. Do not call the update tool.

   - successful update - set status synced, content_hash to the new hash,
   last_synced_at to the current ISO 8601 timestamp.

   - failure - set status failed with the reason in notes.

   Continue past failures. Never abort the whole run on a single failure.

8. End by reporting to the user, in the final response and not only in the
manifest, the counts of synced, skipped-unchanged, and failed with per-row
reasons. Never describe a run with any failure as clean.
