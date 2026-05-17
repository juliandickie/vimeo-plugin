export const ERROR_CODES = {
  AUTH_SCOPE: 'auth_scope',
  RATE_LIMITED: 'rate_limited',
  TRANSIENT: 'transient',
  NOT_FOUND: 'not_found',
  UPLOAD_INTERRUPTED: 'upload_interrupted',
  INVALID_INPUT: 'invalid_input',
  UNKNOWN: 'unknown'
}

export function classifyVimeoError (err) {
  const status = err && (err.statusCode || err.status) || null
  const message = (err && err.message) || String(err || '')
  if (status === 401 || status === 403 || /scope|insufficient/i.test(message)) {
    return { code: ERROR_CODES.AUTH_SCOPE, status, message }
  }
  if (status === 429) {
    return { code: ERROR_CODES.RATE_LIMITED, status, message }
  }
  if (status === 404) {
    return { code: ERROR_CODES.NOT_FOUND, status, message }
  }
  if (status === 400 || status === 422) {
    return { code: ERROR_CODES.INVALID_INPUT, status, message }
  }
  if (status && status >= 500 && status <= 599) {
    return { code: ERROR_CODES.TRANSIENT, status, message }
  }
  if (/tus|upload|stream|ECONNRESET|ETIMEDOUT/i.test(message)) {
    return { code: ERROR_CODES.UPLOAD_INTERRUPTED, status, message }
  }
  return { code: ERROR_CODES.UNKNOWN, status, message }
}
