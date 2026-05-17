import { test } from 'node:test'
import assert from 'node:assert/strict'

test('index exports a buildServer that registers all phase 1 tools', async () => {
  const mod = await import('../index.js')
  assert.equal(typeof mod.buildServer, 'function')
  const { toolNames } = mod.buildServer({ accessToken: 'fake' }, () => ({
    request: (o, cb) => cb(null, {}, 200, {}),
    replace: (f, u, p, c) => c(u)
  }))
  for (const t of [
    'vimeo_whoami', 'vimeo_get_video', 'vimeo_list_texttracks',
    'vimeo_update_video_metadata', 'vimeo_delete_texttrack',
    'vimeo_upsert_texttrack', 'vimeo_replace_source', 'vimeo_get_upload_status'
  ]) {
    assert.ok(toolNames.includes(t), `missing tool ${t}`)
  }
})
