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

test('callTool dispatches a known tool and serialises the result', async () => {
  const { callTool } = await import('../index.js')
  const tools = { vimeo_whoami: async () => ({ ok: true, data: { name: 'iDD' } }) }
  const r = await callTool(tools, 'vimeo_whoami', {})
  assert.equal(r.isError, false)
  assert.deepEqual(JSON.parse(r.content[0].text), { ok: true, data: { name: 'iDD' } })
})

test('callTool returns isError for an unknown tool', async () => {
  const { callTool } = await import('../index.js')
  const r = await callTool({}, 'nope', {})
  assert.equal(r.isError, true)
})

test('callTool rejects an inherited property name without throwing', async () => {
  const { callTool } = await import('../index.js')
  const r = await callTool({}, '__proto__', {})
  assert.equal(r.isError, true)
  const r2 = await callTool({}, 'constructor', {})
  assert.equal(r2.isError, true)
})
