import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js'
import { VimeoClient } from './lib/vimeo-client.js'
import { makeTools } from './lib/tools.js'

const TOOL_SCHEMAS = [
  { name: 'vimeo_whoami', description: 'Return the authenticated Vimeo account. Use as a precondition check.', inputSchema: { type: 'object', properties: {} } },
  { name: 'vimeo_get_video', description: 'Get a video name, description, upload and transcode status.', inputSchema: { type: 'object', properties: { videoId: { type: 'string' } }, required: ['videoId'] } },
  { name: 'vimeo_list_texttracks', description: 'List text tracks for a video.', inputSchema: { type: 'object', properties: { videoId: { type: 'string' } }, required: ['videoId'] } },
  { name: 'vimeo_update_video_metadata', description: 'Update title and description on a video.', inputSchema: { type: 'object', properties: { videoId: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' } }, required: ['videoId'] } },
  { name: 'vimeo_delete_texttrack', description: 'Delete a text track by its uri.', inputSchema: { type: 'object', properties: { trackUri: { type: 'string' } }, required: ['trackUri'] } },
  { name: 'vimeo_upsert_texttrack', description: 'Create or replace the text track for a language and upload its contents.', inputSchema: { type: 'object', properties: { videoId: { type: 'string' }, type: { type: 'string' }, language: { type: 'string' }, name: { type: 'string' }, contents: { type: 'string' } }, required: ['videoId', 'type', 'language', 'contents'] } },
  { name: 'vimeo_replace_source', description: 'Replace the source file of an existing video via a new version and resumable upload. Destructive.', inputSchema: { type: 'object', properties: { videoUri: { type: 'string' }, filePath: { type: 'string' } }, required: ['videoUri', 'filePath'] } },
  { name: 'vimeo_get_upload_status', description: 'Report whether the latest upload and transcode are complete.', inputSchema: { type: 'object', properties: { videoId: { type: 'string' } }, required: ['videoId'] } }
]

export function buildServer (config, clientFactory) {
  const client = clientFactory
    ? new VimeoClient(config, clientFactory)
    : new VimeoClient(config)
  const tools = makeTools(client)
  const server = new Server(
    { name: 'vimeo', version: '0.1.0' },
    { capabilities: { tools: {} } }
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOL_SCHEMAS }))

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const handler = tools[req.params.name]
    if (!handler) {
      return { content: [{ type: 'text', text: `Unknown tool ${req.params.name}` }], isError: true }
    }
    const result = await handler(req.params.arguments || {})
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
      isError: result.ok === false
    }
  })

  return { server, toolNames: TOOL_SCHEMAS.map((t) => t.name) }
}

async function main () {
  const token = process.env.VIMEO_ACCESS_TOKEN
  if (!token) {
    process.stderr.write('VIMEO_ACCESS_TOKEN is not set. Run /vimeo:setup.\n')
    process.exit(1)
  }
  const { server } = buildServer({ accessToken: token })
  await server.connect(new StdioServerTransport())
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
