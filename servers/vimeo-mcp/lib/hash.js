import crypto from 'node:crypto'
import fs from 'node:fs'

export function sha256Buffer (buf) {
  return crypto.createHash('sha256').update(buf).digest('hex')
}

export function sha256File (filePath) {
  return sha256Buffer(fs.readFileSync(filePath))
}
