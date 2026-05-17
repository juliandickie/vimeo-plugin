import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sha256Buffer } from '../lib/hash.js'

test('sha256 of "abc" is the known digest', () => {
  assert.equal(
    sha256Buffer(Buffer.from('abc')),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
  )
})
