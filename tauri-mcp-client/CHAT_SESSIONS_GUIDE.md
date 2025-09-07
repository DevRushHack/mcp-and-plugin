# FastAPI Chat Sessions - Cursor-like Interface

## Overview

The FastAPI server now includes session management for chat conversations, creating a Cursor-like experience where each query is preserved and displayed in expandable accordions.

## Features

### 🎯 Session Management
- **Persistent Sessions**: Each query creates a new session that's saved to disk
- **Session History**: All previous conversations are preserved and accessible
- **Message Threading**: Each session maintains a complete conversation thread

### 🎨 Cursor-like UI
- **Query First**: Input field is prominently displayed at the top
- **Accordion Interface**: Each query/response is displayed in expandable cards
- **Expandable Content**: Click to expand/collapse conversation details
- **Message History**: See the full conversation flow for each query

### 🔧 API Endpoints

#### Session Management
- `GET /sessions` - List all chat sessions
- `GET /sessions/{session_id}/messages` - Get messages for a specific session
- `DELETE /sessions/{session_id}` - Delete a session
- `POST /query` - Send a query (optionally with session_id for continuation)

#### Core Features
- `GET /health` - Server health check
- `GET /tools` - List available MCP tools
- `GET /` - API information

## Usage

### Starting a New Conversation
1. Type your question in the input field at the top
2. Press Enter or click "Send"
3. A new session accordion will appear with your query
4. The accordion expands automatically to show the response

### Viewing Previous Conversations
1. Previous conversations appear as collapsed accordions below the input
2. Click on any accordion header to expand and view the full conversation
3. Each message is timestamped and color-coded (user vs assistant)

### Managing Sessions
- Click "Delete" on any accordion to remove that session permanently
- Sessions are automatically saved to disk in the `sessions/` directory
- Sessions persist across server restarts

## File Structure

```
api/
├── main.py                 # FastAPI server with session endpoints
├── mcp_client.py          # MCP client with session integration
├── session_manager.py     # Session management logic
├── sessions/              # Saved session files
└── utils/
    └── logger.py          # Logging utilities
```

## Session Data Structure

Each session contains:
- **ID**: Unique session identifier
- **Query**: Original user query that started the session
- **Timestamp**: When the session was created
- **Messages**: Array of conversation messages
- **Status**: active, completed, or error

## Benefits

### 👤 User Experience
- **Memory**: The system remembers previous conversations
- **Context**: Easy to reference past queries and responses
- **Organization**: Clean, organized view of all interactions

### 🔧 Developer Experience
- **Debugging**: Full conversation history for troubleshooting
- **Analytics**: Track query patterns and response quality
- **Persistence**: No data loss between server restarts

### 🎯 Cursor-like Features
- **Input First**: Query input is prominently displayed
- **Progressive Disclosure**: Expand only what you want to see
- **Visual Hierarchy**: Clear distinction between queries and responses
- **Timestamp Tracking**: Know when each interaction occurred

## Getting Started

1. **Start the server**: The session system is automatically enabled
2. **Ask a question**: Type in the input field and press Enter
3. **Explore history**: Click on previous conversation accordions
4. **Manage sessions**: Use the delete button to clean up old conversations

The system creates a familiar, Cursor-like experience while maintaining all the powerful MCP tool integration capabilities.
