export function interpretUploadStatus (videoJson) {
  const upload = (videoJson && videoJson.upload) || {}
  const transcode = (videoJson && videoJson.transcode) || {}
  const uploadStatus = upload.status || 'unknown'
  const transcodeStatus = transcode.status || 'unknown'
  const failed = uploadStatus === 'error' || transcodeStatus === 'error'
  const ready = uploadStatus === 'complete' && transcodeStatus === 'complete'
  return { ready, failed, uploadStatus, transcodeStatus }
}
