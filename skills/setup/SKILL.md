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
the token authenticates. Be honest about the limit of this check - a
non-mutating call confirms the token works but does not enumerate granted
scopes, so it cannot prove the write scopes are present. Tell the user the
token must have all of these scopes - public, private, edit, upload,
video_files - and ask them to confirm that in their Vimeo app settings. State
plainly that if a write scope (edit, upload, video_files) is missing it will
surface as an auth_scope error on the first sync, not now. If vimeo_whoami
itself returns an auth_scope error, the token is missing or invalid - tell the
user to generate a personal access token at the Vimeo developer apps page with
those five scopes, set it in the plugin config field Vimeo Access Token, then
re-run /vimeo:setup (the token is read when the MCP server starts, so a config
change needs the plugin reloaded or the session restarted before re-running).

2. Resolve the manifest Sheet. If the plugin config field Manifest Google
Sheet ID is set, use it as the manifest and confirm it is readable using the
Scribe plugin's Sheets tools. If that Sheet is not readable (wrong id, no
permission, deleted), do not create a second sheet silently - tell the user
the configured Sheet is not accessible and ask them to verify the id or clear
the config field so a fresh sheet is created. If the config field is empty,
create a new spreadsheet using the Scribe plugin's Sheets tools titled "Vimeo
Sync Manifest" with a single header row exactly - row_id, asset_type,
drive_file_id, drive_file_name, drive_folder_id, vimeo_video_id,
vimeo_folder_id, language, content_hash, status, last_synced_at,
prior_version_ref, notes. Then show the new Sheet ID and instruct the user to
paste it into the Manifest Google Sheet ID config field so future sessions
reuse it.

3. Report the final state - token authenticates yes or no, the required
scopes the user still needs to self-confirm, manifest Sheet ID, and whether it
is freshly created or reused.

Never write any Vimeo data during setup. This is read and bootstrap only.
