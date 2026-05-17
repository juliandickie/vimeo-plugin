---
name: vimeo-api
description: Background knowledge for using the Vimeo MCP tools - whoami, get video, list and upsert and delete text tracks, update metadata, replace source, get upload status. Activates whenever a Vimeo write or read is being planned or executed.
user-invocable: false
---

# Vimeo - MCP Tool Knowledge

The bundled MCP server exposes these tools. Each returns JSON
`{ ok, data }` on success or `{ ok: false, error: { code, status, message } }`
on failure. Error codes - auth_scope, rate_limited, transient, not_found,
upload_interrupted, invalid_input, unknown.

- vimeo_whoami - no args. Confirms the token works. Run before any write. An
auth_scope error means the token is missing a required scope (public private
edit upload video_files). Send the user to /vimeo:setup.

- vimeo_get_video - args videoId. Returns name, description, upload.status,
transcode.status.

- vimeo_list_texttracks - args videoId. Returns the array of tracks, each with
uri, language, type, active.

- vimeo_upsert_texttrack - args videoId, type (captions or subtitles),
language (BCP 47), optional name, contents (the full caption file text). It
lists tracks, deletes the existing same-language same-type track if present,
creates a fresh track, and uploads the contents. Idempotent at the workflow
level via the manifest hash, not inside the tool.

- vimeo_delete_texttrack - args trackUri. Only used during explicit
reconciliation of a removed language.

- vimeo_update_video_metadata - args videoId, optional name, optional
description.

- vimeo_replace_source - args videoUri (like /videos/123), filePath (a local
path already downloaded via Scribe). Creates a new version and performs a
resumable upload. Destructive. Only call after the double-confirmation gate
and after the prior version reference is written to the manifest.

- vimeo_get_upload_status - args videoId. Returns ready and failed booleans.
Poll after replace until ready true or failed true.

## Caption type rule

Use type captions when the file represents spoken dialogue for the same
language as the audio. Use type subtitles for translations into other
languages. The manifest asset_type is always caption regardless; the Vimeo
type is decided per row from the language relative to the video's spoken
language. When unsure, default to subtitles for non-source languages.
