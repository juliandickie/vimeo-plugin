import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeTools } from '../lib/tools.js'

function stubClient (overrides = {}) {
  return Object.assign({
    whoami: async () => ({ uri: '/users/1', name: 'iDD' }),
    getVideo: async () => ({ uri: '/videos/1', name: 'V', description: 'D' }),
    listTextTracks: async () => [{ uri: '/t/9', language: 'es', type: 'captions' }],
    createTextTrack: async () => ({ uri: '/t/10', link: 'https://captions.cloud.vimeo.com/x' }),
    uploadTextTrackFile: async () => 200,
    deleteTextTrack: async () => 204,
    updateMetadata: async (id, m) => ({ uri: `/videos/${id}`, name: m.name }),
    replaceSource: async () => '/videos/1',
    getUploadStatus: async () => ({ upload: { status: 'complete' }, transcode: { status: 'complete' } })
  }, overrides)
}

test('vimeo_whoami returns ok with account', async () => {
  const tools = makeTools(stubClient())
  const r = await tools.vimeo_whoami({})
  assert.equal(r.ok, true)
  assert.equal(r.data.name, 'iDD')
})

test('vimeo_upsert_texttrack replaces when language exists', async () => {
  const calls = []
  const tools = makeTools(stubClient({
    deleteTextTrack: async (uri) => { calls.push(['delete', uri]); return 204 },
    createTextTrack: async () => { calls.push(['create']); return { uri: '/t/11', link: 'https://captions.cloud.vimeo.com/y' } },
    uploadTextTrackFile: async () => { calls.push(['put']); return 200 }
  }))
  const r = await tools.vimeo_upsert_texttrack({
    videoId: '1', type: 'captions', language: 'es', contents: 'WEBVTT'
  })
  assert.equal(r.ok, true)
  assert.deepEqual(calls.map(c => c[0]), ['delete', 'create', 'put'])
})

test('vimeo_upsert_texttrack creates when language absent', async () => {
  const calls = []
  const tools = makeTools(stubClient({
    listTextTracks: async () => [],
    deleteTextTrack: async () => { calls.push(['delete']); return 204 },
    createTextTrack: async () => { calls.push(['create']); return { uri: '/t/11', link: 'https://captions.cloud.vimeo.com/y' } },
    uploadTextTrackFile: async () => { calls.push(['put']); return 200 }
  }))
  const r = await tools.vimeo_upsert_texttrack({
    videoId: '1', type: 'captions', language: 'fr', contents: 'WEBVTT'
  })
  assert.equal(r.ok, true)
  assert.deepEqual(calls.map(c => c[0]), ['create', 'put'])
})

test('transient error is retried then surfaces typed failure', async () => {
  let n = 0
  const tools = makeTools(stubClient({
    whoami: async () => { n++; const e = new Error('boom'); e.statusCode = 503; throw e }
  }), { retries: 2, backoffMs: 0 })
  const r = await tools.vimeo_whoami({})
  assert.equal(r.ok, false)
  assert.equal(r.error.code, 'transient')
  assert.equal(n, 3)
})

test('vimeo_get_upload_status reports ready', async () => {
  const tools = makeTools(stubClient())
  const r = await tools.vimeo_get_upload_status({ videoId: '1' })
  assert.equal(r.ok, true)
  assert.equal(r.data.ready, true)
})
