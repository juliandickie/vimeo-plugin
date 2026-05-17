#!/usr/bin/env node
// Launcher for the Vimeo MCP server.
//
// WHY this file exists: .mcp.json args interpolation guarantees ${CLAUDE_PLUGIN_ROOT}
// but NOT ${CLAUDE_PLUGIN_DATA}. The data dir (where node_modules live) is only safe
// to use in the env block. So this tiny launcher - which needs NO third-party deps -
// lives in the plugin root and reads VIMEO_MCP_DATA from env, then spawns the real
// server from the data dir where @modelcontextprotocol/sdk and @vimeo/vimeo are installed.

import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { env, execPath, exit } from 'node:process';

const dataDir = env.VIMEO_MCP_DATA;
if (!dataDir) {
  process.stderr.write(
    'vimeo-mcp launcher: VIMEO_MCP_DATA is not set. ' +
    'The host should inject it via the .mcp.json env block. ' +
    'Cannot locate the server - aborting.\n'
  );
  exit(1);
}

const serverPath = join(dataDir, 'vimeo-mcp', 'index.js');

const child = spawn(execPath, [serverPath], { stdio: 'inherit', env });

child.on('error', (e) => {
  process.stderr.write(`vimeo-mcp launcher: failed to start server at ${serverPath}: ${e.message}\n`);
  exit(1);
});

child.on('exit', (code) => {
  exit(code == null ? 0 : code);
});
