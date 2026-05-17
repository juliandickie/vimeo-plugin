import { test } from 'node:test'
import assert from 'node:assert/strict'
import { interpretUploadStatus } from '../lib/status.js'

test('complete and complete is ready', () => {
  const r = interpretUploadStatus({ upload: { status: 'complete' }, transcode: { status: 'complete' } })
  assert.equal(r.ready, true)
  assert.equal(r.failed, false)
})

test('error transcode is failed', () => {
  const r = interpretUploadStatus({ upload: { status: 'complete' }, transcode: { status: 'error' } })
  assert.equal(r.failed, true)
  assert.equal(r.ready, false)
})

test('in progress is neither ready nor failed', () => {
  const r = interpretUploadStatus({ upload: { status: 'in_progress' }, transcode: { status: 'in_progress' } })
  assert.equal(r.ready, false)
  assert.equal(r.failed, false)
})
