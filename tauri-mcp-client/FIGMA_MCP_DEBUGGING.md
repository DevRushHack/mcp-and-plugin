# Figma MCP Tools Debugging Guide

## Issue: MCP Tools Not Being Called Properly

The Figma MCP tools aren't executing properly to update Figma. Here's a systematic debugging approach:

## 1. Check MCP Server Connection

First, verify that the MCP server is running and accessible:

```bash
# Test if the MCP server is running
bun run /Users/akuldeepj/Desktop/code/cursor-talk-to-figma-mcp/src/talk_to_figma_mcp/server.ts
```

## 2. Check WebSocket Connection to Figma

The MCP server needs to connect to Figma via WebSocket. Common issues:

### A. Figma Plugin Not Running
- Open Figma
- Go to Plugins > Development > cursor-talk-to-figma-mcp
- Make sure the plugin is active and showing "Connected to socket server"

### B. WebSocket Port Issues
- Default port is 3055
- Check if anything else is using this port: `lsof -i :3055`
- The MCP server should show: "Connected to Figma socket server"

### C. Channel Connection
- The MCP tools require joining a channel first
- Use `join_channel` tool before other Figma operations

## 3. Debug the FastAPI Bridge

Use the new debug endpoints I've added:

### A. Check MCP Status
```bash
curl http://localhost:8000/debug/mcp-status
```

Should return:
```json
{
  "mcp_connected": true,
  "tools_count": 50+,
  "available_tools": [...]
}
```

### B. Test Direct Figma Tool Call
```bash
curl -X POST http://localhost:8000/debug/test-figma-tool
```

Should return:
```json
{
  "success": true,
  "tool_result": "..."
}
```

## 4. Debug Session Flow

I've added extensive debugging to the MCP client. Check the FastAPI logs for:

```
DEBUG: Attempting to connect to MCP server at: ...
DEBUG: Successfully connected to MCP server
DEBUG: Retrieved X MCP tools
DEBUG: Available tools: [...]
DEBUG: Calling LLM with X messages
DEBUG: Available tools for LLM: [...]
DEBUG: LLM tool calls: [...]
DEBUG: Tool X called with args: {...}
DEBUG: Tool X result: {...}
```

## 5. Common Issues & Solutions

### Issue 1: "Not connected to Figma"
**Solution:** 
1. Start Figma
2. Open the plugin
3. Ensure WebSocket shows "Connected"
4. Use `join_channel` first

### Issue 2: "Must join a channel before sending commands"
**Solution:**
```bash
# Test joining a channel
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "join the default channel"}'
```

### Issue 3: Tools available but not being called
**Possible causes:**
- LLM not recognizing the tools
- Tool descriptions unclear
- OpenAI API key issues
- Tool input schema problems

## 6. Testing Steps

### Step 1: Start Everything
```bash
# Terminal 1: Start FastAPI
cd /path/to/tauri-mcp-client
npm run fastapi:setup

# Terminal 2: Start Tauri (alternative)
npm run tauri:dev:auto
```

### Step 2: Open Figma & Plugin
1. Open Figma
2. Go to Plugins > Development > cursor-talk-to-figma-mcp
3. Verify "Connected to socket server" message

### Step 3: Test Debug Endpoints
Visit: http://localhost:3000 (or Tauri app)
1. Click "Test MCP & Figma Connection" in Debug Tools
2. Check browser console for detailed logs
3. Look at FastAPI logs for debug output

### Step 4: Test Simple Query
```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "get information about the current Figma document"}'
```

## 7. Log Analysis

### FastAPI Logs (Terminal running the server)
Look for:
- "DEBUG: Successfully connected to MCP server"
- "DEBUG: Available tools: [join_channel, get_document_info, ...]"
- "DEBUG: Tool X called with args: ..."

### Browser Console (Developer Tools)
Look for:
- Network requests to /query endpoint
- Responses from debug endpoints
- JavaScript errors

### Figma Plugin Console
1. In Figma, open Developer Tools (F12)
2. Look for plugin messages
3. Check for WebSocket connection logs

## 8. Quick Fix Commands

If you need to restart everything cleanly:

```bash
# Kill all related processes
pkill -f "fastapi"
pkill -f "bun.*server.ts"
pkill -f "tauri"

# Restart everything
cd /path/to/tauri-mcp-client
npm run fastapi:rebuild  # Clean Python environment
npm run tauri:dev:auto   # Start with auto FastAPI
```

## 9. Expected Working Flow

1. **Startup**: FastAPI connects to MCP server, MCP server connects to Figma
2. **Tools Loading**: 50+ Figma tools become available
3. **Channel Join**: First query joins a channel automatically
4. **Tool Execution**: LLM calls appropriate tools, tools execute in Figma
5. **Results**: Changes appear in Figma, results returned to user

## 10. Debugging Output

The new debug logs will show exactly where the flow breaks. Common patterns:

**✅ Working:**
```
DEBUG: Successfully connected to MCP server
DEBUG: Available tools: [join_channel, create_rectangle, ...]
DEBUG: LLM tool calls: [{"function": {"name": "create_rectangle"}}]
DEBUG: Tool create_rectangle result: {"success": true}
```

**❌ Broken:**
```
DEBUG: Error connecting to MCP server: ...
DEBUG: Available tools: []  # No tools loaded
DEBUG: LLM tool calls: null  # LLM not calling tools
DEBUG: Error calling tool: ...  # Tool execution failed
```

Use this guide to systematically identify where the issue occurs!
