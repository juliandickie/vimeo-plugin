---
name: setup
description: First-run setup for the Vimeo plugin - verify the access token and scopes and create or locate the manifest Google Sheet.
disable-model-invocation: true
argument-hint: ""
---

# Vimeo - Setup

Run this once per machine before any sync.

## Steps

1. Confirm the token. Call vimeo_whoami. If it returns ok with an account,
the token is valid. If it returns an auth_scope error, tell the user to
generate a personal access token at the Vimeo developer apps page with the
scopes public private edit upload video_files, set it in the plugin config
field Vimeo Access Token, and reload the plugin.

2. Resolve the manifest Sheet. If the plugin config field Manifest Google
Sheet ID is set, use it as the manifest and confirm it is readable using the
Scribe plugin's Sheets tools. If it is empty, create a new spreadsheet using
the Scribe plugin's Sheets tools titled "Vimeo Sync Manifest" with a single
header row exactly - row_id, asset_type, drive_file_id, drive_file_name,
drive_folder_id, vimeo_video_id, vimeo_folder_id, language, content_hash,
status, last_synced_at, prior_version_ref, notes. Then show the new Sheet ID
and instruct the user to paste it into the Manifest Google Sheet ID config
field so future sessions reuse it.

3. Report the final state - token valid yes or no, manifest Sheet ID, and
whether it is freshly created or reused.

Never write any Vimeo data during setup. This is read and bootstrap only.
