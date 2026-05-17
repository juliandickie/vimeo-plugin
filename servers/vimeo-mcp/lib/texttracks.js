export function planTextTrackUpsert (existingTracks, target) {
  const tracks = Array.isArray(existingTracks) ? existingTracks : []
  const match = tracks.find(
    t => t && t.language === target.language && t.type === target.type
  )
  if (match) {
    return { action: 'replace', existingUri: match.uri }
  }
  return { action: 'create', existingUri: null }
}
