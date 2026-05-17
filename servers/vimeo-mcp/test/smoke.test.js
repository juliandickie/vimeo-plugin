import { test } from 'node:test'
import assert from 'node:assert/strict'

test('errors module exports classifyVimeoError', async () => {
  const mod = await import('../lib/errors.js')
  assert.equal(typeof mod.classifyVimeoError, 'function')
})
