import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

export function createDefaultClient (config) {
  const pkg = require('@vimeo/vimeo')
  const Vimeo = pkg.Vimeo
  return new Vimeo(config.clientId || '', config.clientSecret || '', config.accessToken)
}

export class VimeoClient {
  constructor (config, clientFactory = createDefaultClient) {
    this._client = clientFactory(config)
    this._token = config.accessToken
  }

  _request (options) {
    return new Promise((resolve, reject) => {
      this._client.request(options, (err, body, statusCode, headers) => {
        if (err) {
          const e = new Error(typeof err === 'string' ? err : (err.message || 'request failed'))
          e.statusCode = statusCode || (err && err.statusCode) || null
          return reject(e)
        }
        resolve({ body, statusCode, headers })
      })
    })
  }

  async whoami () {
    const res = await this._request({ path: '/me?fields=uri,name', method: 'GET' })
    return res.body
  }

  async getVideo (videoId) {
    const res = await this._request({
      path: `/videos/${videoId}?fields=uri,name,description,upload.status,transcode.status`,
      method: 'GET'
    })
    return res.body
  }

  async listTextTracks (videoId) {
    const res = await this._request({ path: `/videos/${videoId}/texttracks`, method: 'GET' })
    return (res.body && res.body.data) || []
  }

  async createTextTrack (videoId, { type, language, name }) {
    const res = await this._request({
      path: `/videos/${videoId}/texttracks`,
      method: 'POST',
      query: { type, language, name: name || language }
    })
    return res.body
  }

  async uploadTextTrackFile (uploadLink, contents) {
    const host = 'captions.cloud.vimeo.com'
    const res = await this._request({
      hostname: host,
      path: uploadLink.replace(`https://${host}/`, ''),
      method: 'PUT',
      headers: { Authorization: 'bearer ' + this._token, 'Content-Type': 'text/plain' },
      body: contents
    })
    return res.statusCode
  }

  async deleteTextTrack (trackUri) {
    const res = await this._request({ path: trackUri, method: 'DELETE' })
    return res.statusCode
  }

  async updateMetadata (videoId, { name, description }) {
    const query = {}
    if (name !== undefined) query.name = name
    if (description !== undefined) query.description = description
    const res = await this._request({ path: `/videos/${videoId}`, method: 'PATCH', query })
    return res.body
  }

  replaceSource (filePath, videoUri, onProgress = () => {}) {
    return new Promise((resolve, reject) => {
      this._client.replace(
        filePath,
        videoUri,
        {},
        (uri) => resolve(uri),
        (bytes, total) => onProgress(bytes, total),
        (err) => reject(new Error(typeof err === 'string' ? err : (err.message || 'replace failed')))
      )
    })
  }

  async getUploadStatus (videoId) {
    const res = await this._request({
      path: `/videos/${videoId}?fields=upload.status,transcode.status`,
      method: 'GET'
    })
    return res.body
  }
}
