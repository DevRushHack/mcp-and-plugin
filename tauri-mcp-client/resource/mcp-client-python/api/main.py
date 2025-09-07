from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional
from contextlib import asynccontextmanager
from mcp_client import MCPClient
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()


class Settings(BaseSettings):
    server_script_path: str = "/Users/akuldeepj/Desktop/code/cursor-talk-to-figma-mcp/src/talk_to_figma_mcp/server.ts"
    openai_api_key: str = ""
    fastapi_host: str = "0.0.0.0"
    fastapi_port: int = 8000
    fastapi_reload: bool = True

    class Config:
        env_file = ".env"


settings = Settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    client = MCPClient(openai_api_key=settings.openai_api_key)
    try:
        connected = await client.connect_to_server(settings.server_script_path)
        if not connected:
            raise HTTPException(
                status_code=500, detail="Failed to connect to MCP server"
            )
        app.state.client = client
        yield
    except Exception as e:
        print(f"Error during lifespan: {e}")
        raise HTTPException(status_code=500, detail="Error during lifespan") from e
    finally:
        # shutdown
        await client.cleanup()


app = FastAPI(title="MCP Client API", lifespan=lifespan)


# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)


class QueryRequest(BaseModel):
    query: str
    session_id: Optional[str] = None


class SessionRequest(BaseModel):
    session_id: str


class Message(BaseModel):
    role: str
    content: Any


class ToolCall(BaseModel):
    name: str
    args: Dict[str, Any]


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "FastAPI server is running"}


@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Figma MCP FastAPI Server with Session Management",
        "version": "0.2.0",
        "endpoints": {
            "health": "/health",
            "query": "/query",
            "tools": "/tools",
            "sessions": "/sessions",
            "session_messages": "/sessions/{session_id}/messages",
            "delete_session": "/sessions/{session_id}",
            "debug_mcp_status": "/debug/mcp-status",
            "debug_test_figma_tool": "/debug/test-figma-tool"
        }
    }


@app.post("/query")
async def process_query(request: QueryRequest):
    """Process a query and return the response with session management"""
    try:
        print(f"Processing query: {request.query}")
        print(f"Session ID: {request.session_id}")
        
        result = await app.state.client.process_query(request.query, request.session_id)
        print(f"Query result: {result}")
        
        return result
    except Exception as e:
        print(f"Error processing query: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/tools")
async def get_tools():
    """Get the list of available tools"""
    try:
        tools = await app.state.client.get_mcp_tools()
        return {
            "tools": [
                {
                    "name": tool.name,
                    "description": tool.description,
                    "input_schema": tool.inputSchema,
                }
                for tool in tools
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/sessions")
async def get_sessions():
    """Get all chat sessions"""
    try:
        sessions = app.state.client.get_sessions()
        return {"sessions": sessions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/sessions/{session_id}/messages")
async def get_session_messages(session_id: str):
    """Get messages for a specific session"""
    try:
        messages = app.state.client.get_session_messages(session_id)
        return {"session_id": session_id, "messages": messages}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a session"""
    try:
        success = app.state.client.delete_session(session_id)
        if success:
            return {"message": f"Session {session_id} deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Session not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/debug/mcp-status")
async def debug_mcp_status():
    """Debug endpoint to check MCP connection and tools status"""
    try:
        # Get tools to verify connection
        tools = await app.state.client.get_mcp_tools()
        
        return {
            "mcp_connected": True,
            "tools_count": len(tools),
            "available_tools": [{"name": tool.name, "description": tool.description} for tool in tools],
        }
    except Exception as e:
        return {
            "mcp_connected": False,
            "error": str(e),
            "tools_count": 0,
            "available_tools": []
        }


@app.post("/debug/test-figma-tool")
async def debug_test_figma_tool():
    """Test endpoint to directly call a simple Figma tool"""
    try:
        # Try calling a simple tool like get_document_info
        result = await app.state.client.session.call_tool("get_document_info", {})
        return {
            "success": True,
            "tool_result": result.content if hasattr(result, 'content') else str(result)
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host=settings.fastapi_host, port=settings.fastapi_port, reload=settings.fastapi_reload)
