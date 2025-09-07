from typing import Optional
from contextlib import AsyncExitStack
import traceback

# from utils.logger import logger
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from datetime import datetime
from utils.logger import logger
import json
import os

from openai import OpenAI
from session_manager import SessionManager


class MCPClient:
    def __init__(self, openai_api_key: Optional[str] = None):
        # Initialize session and client objects
        self.session: Optional[ClientSession] = None
        self.exit_stack = AsyncExitStack()
        self.llm = OpenAI(api_key=openai_api_key) if openai_api_key else OpenAI()
        self.tools = []
        self.messages = []
        self.logger = logger
        self.session_manager = SessionManager()

    # connect to the MCP server
    async def connect_to_server(self, server_script_path: str):
        try:
            print(f"DEBUG: Attempting to connect to MCP server at: {server_script_path}")
            
            is_python = server_script_path.endswith(".py")
            is_js = server_script_path.endswith(".js") or server_script_path.endswith(".ts")
            if not (is_python or is_js):
                raise ValueError("Server script must be a .py or .js file")

            command = "python" if is_python else "bun"
            print(f"DEBUG: Using command: {command}")
            
            server_params = StdioServerParameters(
                command=command, args=[server_script_path], env=None
            )

            stdio_transport = await self.exit_stack.enter_async_context(
                stdio_client(server_params)
            )
            self.stdio, self.write = stdio_transport
            self.session = await self.exit_stack.enter_async_context(
                ClientSession(self.stdio, self.write)
            )

            await self.session.initialize()

            self.logger.info("Connected to MCP server")
            print("DEBUG: Successfully connected to MCP server")

            mcp_tools = await self.get_mcp_tools()
            print(f"DEBUG: Retrieved {len(mcp_tools)} MCP tools")
            
            self.tools = [
                {
                    "name": tool.name,
                    "description": tool.description,
                    "input_schema": tool.inputSchema,
                }
                for tool in mcp_tools
            ]

            self.logger.info(
                f"Available tools: {[tool['name'] for tool in self.tools]}"
            )
            print(f"DEBUG: Available tools: {[tool['name'] for tool in self.tools]}")

            return True

        except Exception as e:
            self.logger.error(f"Error connecting to MCP server: {e}")
            print(f"DEBUG: Error connecting to MCP server: {e}")
            traceback.print_exc()
            raise

    # get mcp tool list
    async def get_mcp_tools(self):
        try:
            response = await self.session.list_tools()
            return response.tools
        except Exception as e:
            self.logger.error(f"Error getting MCP tools: {e}")
            raise

    # process query with session management and progress callbacks
    async def process_query_with_progress(self, query: str, session_id: Optional[str] = None, progress_callback=None):
        try:
            self.logger.info(f"Processing query with progress: {query}")
            
            if progress_callback:
                await progress_callback({
                    "status": "initializing",
                    "message": "Setting up session...",
                    "progress": 20
                })
            
            # Create or get session
            if session_id is None:
                session_id = self.session_manager.create_session(query)
            
            # Add user message to session
            self.session_manager.add_message(session_id, "user", query)
            
            # Get session messages for context
            session_messages = self.session_manager.get_session_messages(session_id)
            
            # Convert session messages to working format
            self.messages = []
            for msg in session_messages:
                self.messages.append({
                    "role": msg.role,
                    "content": msg.content
                })

            if progress_callback:
                await progress_callback({
                    "status": "calling_llm",
                    "message": "Calling AI model...",
                    "progress": 40
                })

            while True:
                response = await self.call_llm()

                # the response is a text message
                if response.content[0].type == "text" and len(response.content) == 1:
                    assistant_content = response.content[0].text
                    assistant_message = {
                        "role": "assistant",
                        "content": assistant_content,
                    }
                    self.messages.append(assistant_message)
                    
                    # Add assistant message to session
                    self.session_manager.add_message(session_id, "assistant", assistant_content)
                    self.session_manager.update_session_status(session_id, "completed")
                    
                    if progress_callback:
                        await progress_callback({
                            "status": "completed",
                            "message": "Query completed successfully",
                            "progress": 100
                        })
                    
                    await self.log_conversation()
                    break

                # the response is a tool call
                if progress_callback:
                    await progress_callback({
                        "status": "executing_tools",
                        "message": "Executing Figma tools...",
                        "progress": 60
                    })
                
                assistant_content = response.to_dict()["content"]
                assistant_message = {
                    "role": "assistant",
                    "content": assistant_content,
                }
                self.messages.append(assistant_message)
                
                # Add assistant message to session (serialize tool calls for storage)
                tool_call_text = f"Tool calls: {json.dumps(assistant_content, indent=2)}"
                self.session_manager.add_message(session_id, "assistant", tool_call_text)
                
                await self.log_conversation()

                tool_count = len([c for c in response.content if c.type == "tool_use"])
                current_tool = 0

                for content in response.content:
                    if content.type == "tool_use":
                        current_tool += 1
                        tool_name = content.name
                        tool_args = content.input
                        tool_use_id = content.id
                        
                        if progress_callback:
                            await progress_callback({
                                "status": "executing_tool",
                                "message": f"Executing {tool_name} ({current_tool}/{tool_count})...",
                                "progress": 60 + (30 * current_tool / tool_count)
                            })
                        
                        self.logger.info(f"Calling tool {tool_name} with args {tool_args}")
                        try:
                            result = await self.session.call_tool(tool_name, tool_args)
                            self.logger.info(f"Tool {tool_name} result: {result}")
                            print(f"DEBUG: Tool {tool_name} called with args: {tool_args}")
                            print(f"DEBUG: Tool {tool_name} result: {result}")
                            
                            tool_result_message = {
                                "role": "user",
                                "content": [
                                    {
                                        "type": "tool_result",
                                        "tool_use_id": tool_use_id,
                                        "content": result.content,
                                    }
                                ],
                            }
                            self.messages.append(tool_result_message)
                            
                            # Add tool result to session
                            tool_result_text = f"Tool {tool_name} result: {str(result.content)[:500]}..."
                            self.session_manager.add_message(session_id, "assistant", tool_result_text)
                            
                            await self.log_conversation()
                        except Exception as e:
                            self.logger.error(f"Error calling tool {tool_name}: {e}")
                            print(f"DEBUG: Error calling tool {tool_name}: {e}")
                            self.session_manager.update_session_status(session_id, "error")
                            
                            if progress_callback:
                                await progress_callback({
                                    "status": "error",
                                    "message": f"Error executing {tool_name}: {str(e)}",
                                    "progress": 100
                                })
                            raise

            # Convert messages to JSON-serializable format
            serializable_messages = []
            for msg in self.messages:
                if isinstance(msg, dict):
                    # Convert complex content to strings
                    if 'content' in msg and isinstance(msg['content'], list):
                        content_str = []
                        for content_item in msg['content']:
                            if isinstance(content_item, dict):
                                content_str.append(str(content_item))
                            else:
                                content_str.append(str(content_item))
                        serializable_msg = {
                            'role': msg.get('role', 'unknown'),
                            'content': ' '.join(content_str)
                        }
                    else:
                        serializable_msg = {
                            'role': msg.get('role', 'unknown'),
                            'content': str(msg.get('content', ''))
                        }
                    serializable_messages.append(serializable_msg)
                else:
                    serializable_messages.append(str(msg))

            return {
                "session_id": session_id,
                "messages": serializable_messages
            }

        except Exception as e:
            self.logger.error(f"Error processing query: {e}")
            if session_id:
                self.session_manager.update_session_status(session_id, "error")
            
            if progress_callback:
                await progress_callback({
                    "status": "error", 
                    "message": f"Query failed: {str(e)}",
                    "progress": 100
                })
            raise
        try:
            self.logger.info(f"Processing query: {query}")
            
            # Create or get session
            if session_id is None:
                session_id = self.session_manager.create_session(query)
            
            # Add user message to session
            self.session_manager.add_message(session_id, "user", query)
            
            # Get session messages for context
            session_messages = self.session_manager.get_session_messages(session_id)
            
            # Convert session messages to working format
            self.messages = []
            for msg in session_messages:
                self.messages.append({
                    "role": msg.role,
                    "content": msg.content
                })

            while True:
                response = await self.call_llm()

                # the response is a text message
                if response.content[0].type == "text" and len(response.content) == 1:
                    assistant_content = response.content[0].text
                    assistant_message = {
                        "role": "assistant",
                        "content": assistant_content,
                    }
                    self.messages.append(assistant_message)
                    
                    # Add assistant message to session
                    self.session_manager.add_message(session_id, "assistant", assistant_content)
                    self.session_manager.update_session_status(session_id, "completed")
                    
                    await self.log_conversation()
                    break

                # the response is a tool call
                assistant_content = response.to_dict()["content"]
                assistant_message = {
                    "role": "assistant",
                    "content": assistant_content,
                }
                self.messages.append(assistant_message)
                
                # Add assistant message to session (serialize tool calls for storage)
                tool_call_text = f"Tool calls: {json.dumps(assistant_content, indent=2)}"
                self.session_manager.add_message(session_id, "assistant", tool_call_text)
                
                await self.log_conversation()

                for content in response.content:
                    if content.type == "tool_use":
                        tool_name = content.name
                        tool_args = content.input
                        tool_use_id = content.id
                        self.logger.info(
                            f"Calling tool {tool_name} with args {tool_args}"
                        )
                        try:
                            result = await self.session.call_tool(tool_name, tool_args)
                            self.logger.info(f"Tool {tool_name} result: {result}")
                            print(f"DEBUG: Tool {tool_name} called with args: {tool_args}")
                            print(f"DEBUG: Tool {tool_name} result: {result}")
                            
                            tool_result_message = {
                                "role": "user",
                                "content": [
                                    {
                                        "type": "tool_result",
                                        "tool_use_id": tool_use_id,
                                        "content": result.content,
                                    }
                                ],
                            }
                            self.messages.append(tool_result_message)
                            
                            # Add tool result to session
                            tool_result_text = f"Tool {tool_name} result: {str(result.content)[:500]}..."
                            self.session_manager.add_message(session_id, "assistant", tool_result_text)
                            
                            await self.log_conversation()
                        except Exception as e:
                            self.logger.error(f"Error calling tool {tool_name}: {e}")
                            print(f"DEBUG: Error calling tool {tool_name}: {e}")
                            self.session_manager.update_session_status(session_id, "error")
                            raise

            return {
                "session_id": session_id,
                "messages": self.messages
            }

        except Exception as e:
            self.logger.error(f"Error processing query: {e}")
            if session_id:
                self.session_manager.update_session_status(session_id, "error")
            raise

    # Session management methods
    def get_sessions(self):
        """Get all sessions"""
        sessions = self.session_manager.list_sessions()
        return [{
            "id": session.id,
            "query": session.query,
            "timestamp": session.timestamp.isoformat(),
            "status": session.status,
            "message_count": len(session.messages)
        } for session in sessions]
    
    def get_session_messages(self, session_id: str):
        """Get messages for a specific session"""
        messages = self.session_manager.get_session_messages(session_id)
        return [{
            "id": msg.id,
            "role": msg.role,
            "content": msg.content,
            "timestamp": msg.timestamp.isoformat()
        } for msg in messages]
    
    def delete_session(self, session_id: str):
        """Delete a session"""
        return self.session_manager.delete_session(session_id)

    # call llm
    async def call_llm(self):
        try:
            self.logger.info("Calling LLM")
            print(f"DEBUG: Calling LLM with {len(self.messages)} messages")
            
            # Convert messages to OpenAI format
            openai_messages = []
            for message in self.messages:
                print(f"DEBUG: Processing message: {message}")
                if isinstance(message["content"], str):
                    openai_messages.append({
                        "role": message["role"],
                        "content": message["content"]
                    })
                elif isinstance(message["content"], list):
                    # Handle tool calls and tool results
                    content_parts = []
                    for content_item in message["content"]:
                        if isinstance(content_item, dict):
                            if content_item.get("type") == "tool_result":
                                # This is a tool result from user
                                openai_messages.append({
                                    "role": "tool",
                                    "tool_call_id": content_item["tool_use_id"],
                                    "content": str(content_item["content"])
                                })
                                continue
                            elif content_item.get("type") == "tool_use":
                                # This is a tool call from assistant
                                content_parts.append(content_item)
                        else:
                            content_parts.append(content_item)
                    
                    if content_parts:
                        # Convert tool calls to OpenAI format
                        if any(item.get("type") == "tool_use" for item in content_parts if isinstance(item, dict)):
                            tool_calls = []
                            text_content = ""
                            
                            for item in content_parts:
                                if isinstance(item, dict) and item.get("type") == "tool_use":
                                    tool_calls.append({
                                        "id": item["id"],
                                        "type": "function",
                                        "function": {
                                            "name": item["name"],
                                            "arguments": json.dumps(item["input"])
                                        }
                                    })
                                elif isinstance(item, dict) and item.get("type") == "text":
                                    text_content += item.get("text", "")
                            
                            msg = {"role": message["role"]}
                            if text_content:
                                msg["content"] = text_content
                            if tool_calls:
                                msg["tool_calls"] = tool_calls
                            openai_messages.append(msg)
                        else:
                            # Regular content
                            text_content = ""
                            for item in content_parts:
                                if isinstance(item, dict) and item.get("type") == "text":
                                    text_content += item.get("text", "")
                                elif isinstance(item, str):
                                    text_content += item
                            if text_content:
                                openai_messages.append({
                                    "role": message["role"],
                                    "content": text_content
                                })

            # Convert tools to OpenAI format
            openai_tools = []
            for tool in self.tools:
                openai_tools.append({
                    "type": "function",
                    "function": {
                        "name": tool["name"],
                        "description": tool["description"],
                        "parameters": tool["input_schema"]
                    }
                })

            print(f"DEBUG: Available tools for LLM: {[tool['name'] for tool in self.tools]}")
            print(f"DEBUG: OpenAI messages: {len(openai_messages)} messages")

            response = self.llm.chat.completions.create(
                model="gpt-5",
                messages=openai_messages,
                tools=openai_tools if openai_tools else None,
                tool_choice="auto" if openai_tools else None
            )
            
            print(f"DEBUG: LLM response: {response}")
            
            # Convert OpenAI response back to Anthropic-like format for compatibility
            choice = response.choices[0]
            message = choice.message
            
            print(f"DEBUG: LLM message content: {message.content}")
            print(f"DEBUG: LLM tool calls: {message.tool_calls}")
            
            # Create a response object that mimics Anthropic's structure
            class MockResponse:
                def __init__(self, choice):
                    self.content = []
                    
                    if message.content:
                        self.content.append(type('TextContent', (), {
                            'type': 'text',
                            'text': message.content
                        })())
                    
                    if message.tool_calls:
                        for tool_call in message.tool_calls:
                            self.content.append(type('ToolUseContent', (), {
                                'type': 'tool_use',
                                'id': tool_call.id,
                                'name': tool_call.function.name,
                                'input': json.loads(tool_call.function.arguments)
                            })())
                
                def to_dict(self):
                    return {
                        "content": [
                            {
                                "type": item.type,
                                "text": getattr(item, 'text', None),
                                "id": getattr(item, 'id', None),
                                "name": getattr(item, 'name', None),
                                "input": getattr(item, 'input', None)
                            } if item.type == 'tool_use' else {
                                "type": item.type,
                                "text": item.text
                            }
                            for item in self.content
                        ]
                    }
            
            return MockResponse(choice)
            
        except Exception as e:
            self.logger.error(f"Error calling LLM: {e}")
            raise

    # cleanup
    async def cleanup(self):
        try:
            await self.exit_stack.aclose()
            self.logger.info("Disconnected from MCP server")
        except Exception as e:
            self.logger.error(f"Error during cleanup: {e}")
            traceback.print_exc()
            raise

    async def log_conversation(self):
        os.makedirs("conversations", exist_ok=True)

        serializable_conversation = []

        for message in self.messages:
            try:
                serializable_message = {"role": message["role"], "content": []}

                # Handle both string and list content
                if isinstance(message["content"], str):
                    serializable_message["content"] = message["content"]
                elif isinstance(message["content"], list):
                    for content_item in message["content"]:
                        if hasattr(content_item, "to_dict"):
                            serializable_message["content"].append(
                                content_item.to_dict()
                            )
                        elif hasattr(content_item, "dict"):
                            serializable_message["content"].append(content_item.dict())
                        elif hasattr(content_item, "model_dump"):
                            serializable_message["content"].append(
                                content_item.model_dump()
                            )
                        else:
                            serializable_message["content"].append(content_item)

                serializable_conversation.append(serializable_message)
            except Exception as e:
                self.logger.error(f"Error processing message: {str(e)}")
                self.logger.debug(f"Message content: {message}")
                raise

        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        filepath = os.path.join("conversations", f"conversation_{timestamp}.json")

        try:
            with open(filepath, "w") as f:
                json.dump(serializable_conversation, f, indent=2, default=str)
        except Exception as e:
            self.logger.error(f"Error writing conversation to file: {str(e)}")
            self.logger.debug(f"Serializable conversation: {serializable_conversation}")
            raise
