import { classifyVimeoError, ERROR_CODES } from './errors.js'
import { planTextTrackUpsert } from './texttracks.js'
import { interpretUploadStatus } from './status.js'

const RETRYABLE = new Set([ERROR_CODES.TRANSIENT, ERROR_CODES.RATE_LIMITED])

function sleep (ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function withRetry (fn, retries, backoffMs) {
  let attempt = 0
  // total tries = retries + 1
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn()
    } catch (err) {
      const classified = classifyVimeoError(err)
      if (RETRYABLE.has(classified.code) && attempt < retries) {
        attempt++
        await sleep(backoffMs * attempt)
        continue
      }
      throw Object.assign(new Error(classified.message), { classified })
    }
  }
}

export function makeTools (client, opts = {}) {
  const retries = opts.retries ?? 3
  const backoffMs = opts.backoffMs ?? 500

  function ok (data) { return { ok: true, data } }
  function fail (err) {
    const classified = err.classified || classifyVimeoError(err)
    return { ok: false, error: classified }
  }

  async function run (fn) {
    try {
      return ok(await withRetry(fn, retries, backoffMs))
    } catch (err) {
      return fail(err)
    }
  }

  return {
    vimeo_whoami: () => run(() => client.whoami()),

    vimeo_get_video: ({ videoId }) => run(() => client.getVideo(videoId)),

    vimeo_list_texttracks: ({ videoId }) => run(() => client.listTextTracks(videoId)),

    vimeo_update_video_metadata: ({ videoId, name, description }) =>
      run(() => client.updateMetadata(videoId, { name, description })),

    vimeo_delete_texttrack: ({ trackUri }) =>
      run(() => client.deleteTextTrack(trackUri)),

    vimeo_upsert_texttrack: ({ videoId, type, language, name, contents }) =>
      run(async () => {
        const existing = await client.listTextTracks(videoId)
        const plan = planTextTrackUpsert(existing, { type, language })
        if (plan.action === 'replace') {
          await client.deleteTextTrack(plan.existingUri)
        }
        const created = await client.createTextTrack(videoId, { type, language, name })
        const code = await client.uploadTextTrackFile(created.link, contents)
        return { action: plan.action, trackUri: created.uri, httpStatus: code }
      }),

    vimeo_replace_source: ({ videoUri, filePath }) =>
      run(() => client.replaceSource(filePath, videoUri)),

    vimeo_get_upload_status: ({ videoId }) =>
      run(async () => interpretUploadStatus(await client.getUploadStatus(videoId)))
  }
}
