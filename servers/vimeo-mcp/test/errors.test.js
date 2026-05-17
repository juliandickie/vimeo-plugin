import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifyVimeoError, ERROR_CODES } from '../lib/errors.js'

test('403 maps to auth_scope', () => {
  assert.equal(classifyVimeoError({ statusCode: 403, message: 'x' }).code, ERROR_CODES.AUTH_SCOPE)
})

test('429 maps to rate_limited', () => {
  assert.equal(classifyVimeoError({ statusCode: 429 }).code, ERROR_CODES.RATE_LIMITED)
})

test('500 maps to transient', () => {
  assert.equal(classifyVimeoError({ statusCode: 503 }).code, ERROR_CODES.TRANSIENT)
})

test('404 maps to not_found', () => {
  assert.equal(classifyVimeoError({ statusCode: 404 }).code, ERROR_CODES.NOT_FOUND)
})

test('400 maps to invalid_input', () => {
  assert.equal(classifyVimeoError({ statusCode: 400 }).code, ERROR_CODES.INVALID_INPUT)
})

test('tus stream error maps to upload_interrupted', () => {
  assert.equal(classifyVimeoError({ message: 'tus ECONNRESET' }).code, ERROR_CODES.UPLOAD_INTERRUPTED)
})

test('insufficient scope text maps to auth_scope even without status', () => {
  assert.equal(classifyVimeoError({ message: 'insufficient scope' }).code, ERROR_CODES.AUTH_SCOPE)
})
