import { test } from 'node:test'
import assert from 'node:assert/strict'
import { VimeoClient } from '../lib/vimeo-client.js'

function fakeFactory (recorder) {
  return () => ({
    request (options, cb) {
      recorder.push(options)
      if (options.path === '/me?fields=uri,name') {
        return cb(null, { uri: '/users/1', name: 'iDD' }, 200, {})
      }
      if (options.method === 'GET' && options.path.includes('/texttracks')) {
        return cb(null, { data: [{ uri: '/t/9', language: 'es', type: 'captions' }] }, 200, {})
      }
      if (options.method === 'POST' && options.path.includes('/texttracks')) {
        return cb(null, { uri: '/t/10', link: 'https://captions.cloud.vimeo.com/abc' }, 201, {})
      }
      if (options.method === 'PUT') {
        return cb(null, '', 200, {})
      }
      if (options.method === 'PATCH') {
        return cb(null, { uri: options.path, name: options.query.name }, 200, {})
      }
      return cb(null, {}, 200, {})
    },
    replace (file, videoUri, params, complete) {
      recorder.push({ replace: { file, videoUri } })
      complete(videoUri)
    }
  })
}

test('whoami returns account body', async () => {
  const rec = []
  const c = new VimeoClient({ accessToken: 't' }, fakeFactory(rec))
  const me = await c.whoami()
  assert.equal(me.name, 'iDD')
})

test('listTextTracks returns the data array', async () => {
  const c = new VimeoClient({ accessToken: 't' }, fakeFactory([]))
  const tracks = await c.listTextTracks('123')
  assert.equal(tracks[0].language, 'es')
})

test('createTextTrack returns uri and link', async () => {
  const c = new VimeoClient({ accessToken: 't' }, fakeFactory([]))
  const r = await c.createTextTrack('123', { type: 'captions', language: 'fr' })
  assert.equal(r.link, 'https://captions.cloud.vimeo.com/abc')
})

test('replaceSource resolves with the video uri', async () => {
  const c = new VimeoClient({ accessToken: 't' }, fakeFactory([]))
  const uri = await c.replaceSource('/tmp/v.mp4', '/videos/123')
  assert.equal(uri, '/videos/123')
})

test('request error rejects with statusCode attached', async () => {
  const c = new VimeoClient({ accessToken: 't' }, () => ({
    request (o, cb) { cb('boom', null, 500, {}) }
  }))
  await assert.rejects(() => c.whoami(), (e) => e.statusCode === 500)
})

test('uploadTextTrackFile targets the caption host with the stripped path and bearer header', async () => {
  const rec = []
  const c = new VimeoClient({ accessToken: 'tok' }, fakeFactory(rec))
  await c.uploadTextTrackFile('https://captions.cloud.vimeo.com/up/xyz', 'WEBVTT')
  const put = rec.find(o => o.method === 'PUT')
  assert.equal(put.hostname, 'captions.cloud.vimeo.com')
  assert.equal(put.path, 'up/xyz')
  assert.equal(put.headers.Authorization, 'bearer tok')
  assert.equal(put.headers['Content-Type'], 'text/plain')
})

test('createTextTrack records correct method, path, Content-Type header, and query shape', async () => {
  const rec = []
  const c = new VimeoClient({ accessToken: 't' }, () => ({
    request (options, cb) {
      rec.push(options)
      cb(null, { uri: '/t/10', link: 'https://captions.cloud.vimeo.com/abc' }, 201, {})
    }
  }))
  await c.createTextTrack('123', { type: 'subtitles', language: 'es' })
  const call = rec[0]
  assert.equal(call.method, 'POST')
  assert.equal(call.path, '/videos/123/texttracks')
  assert.equal(call.headers['Content-Type'], 'application/json')
  assert.deepEqual(call.query, { type: 'subtitles', language: 'es', name: 'es' })
})

test('uploadTextTrackFile records correct method, hostname, path, Authorization, Content-Type, and body', async () => {
  const rec = []
  const c = new VimeoClient({ accessToken: 'tok' }, () => ({
    request (options, cb) {
      rec.push(options)
      cb(null, '', 200, {})
    }
  }))
  await c.uploadTextTrackFile('https://captions.cloud.vimeo.com/up/x', 'WEBVTT...')
  const call = rec[0]
  assert.equal(call.method, 'PUT')
  assert.equal(call.hostname, 'captions.cloud.vimeo.com')
  assert.equal(call.path, 'up/x')
  assert.equal(call.headers.Authorization, 'bearer tok')
  assert.equal(call.headers['Content-Type'], 'text/plain')
  assert.equal(call.body, 'WEBVTT...')
})

test('uploadTextTrackFile rejects with statusCode 400 for invalid host', async () => {
  const c = new VimeoClient({ accessToken: 'tok' }, () => ({
    request (options, cb) { cb(null, '', 200, {}) }
  }))
  await assert.rejects(
    () => c.uploadTextTrackFile('https://evil.example.com/x', 'data'),
    (e) => e.statusCode === 400
  )
})

test('uploadTextTrackFile rejects with statusCode 400 for empty contents', async () => {
  const c = new VimeoClient({ accessToken: 'tok' }, () => ({
    request (options, cb) { cb(null, '', 200, {}) }
  }))
  await assert.rejects(
    () => c.uploadTextTrackFile('https://captions.cloud.vimeo.com/up/x', ''),
    (e) => e.statusCode === 400
  )
})

test('listVersions returns the data array', async () => {
  const c = new VimeoClient({ accessToken: 't' }, () => ({
    request (o, cb) {
      if (o.method === 'GET' && o.path === '/videos/123/versions?fields=uri,filename,created_time,filesize') {
        return cb(null, { data: [{ uri: '/videos/123/versions/9', filename: 'rev2.mp4', created_time: '2026-01-01T00:00:00+00:00', filesize: 4025322521 }] }, 200, {})
      }
      return cb(null, {}, 200, {})
    }
  }))
  const v = await c.listVersions('123')
  assert.equal(v[0].uri, '/videos/123/versions/9')
  assert.equal(v[0].filename, 'rev2.mp4')
})
