import { test } from 'node:test'
import assert from 'node:assert/strict'
import { planTextTrackUpsert } from '../lib/texttracks.js'

test('no existing tracks means create', () => {
  const r = planTextTrackUpsert([], { type: 'captions', language: 'en' })
  assert.deepEqual(r, { action: 'create', existingUri: null })
})

test('matching language and type means replace', () => {
  const existing = [{ uri: '/videos/1/texttracks/9', language: 'es', type: 'captions' }]
  const r = planTextTrackUpsert(existing, { type: 'captions', language: 'es' })
  assert.deepEqual(r, { action: 'replace', existingUri: '/videos/1/texttracks/9' })
})

test('different language means create', () => {
  const existing = [{ uri: '/videos/1/texttracks/9', language: 'es', type: 'captions' }]
  const r = planTextTrackUpsert(existing, { type: 'captions', language: 'fr' })
  assert.deepEqual(r, { action: 'create', existingUri: null })
})
