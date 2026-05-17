# Vimeo Plugin

Pushes Descript exports from Google Drive into the existing iDD Vimeo library
- multi-language captions, title and description, and gated source-file
replacement - driven by a persistent Google Sheet manifest read through the
Scribe plugin.

## Requirements

- The Scribe plugin installed and authenticated for Google Drive and Sheets.

- A Vimeo personal access token with scopes public private edit upload
video_files, set in the plugin config field Vimeo Access Token.

## Setup

Run /vimeo:setup once. It verifies the token and creates or locates the
manifest Sheet.

## Commands

- /vimeo:reconcile - read-only audit of manifest versus Vimeo

- /vimeo:sync-captions - apply multi-language caption files

- /vimeo:sync-metadata - apply title and description

- /vimeo:replace-source - replace a source file, double-confirmed

## Safety

Every push is dry-run-then-approve. Source replace is double-confirmed and
records the prior version first. Failures are reported loudly and never hidden.
