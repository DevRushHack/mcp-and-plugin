#!/usr/bin/env python3
"""
Simple test script to verify OpenAI integration and Bun support.
"""

import asyncio
import os
from api.mcp_client import MCPClient
from dotenv import load_dotenv

load_dotenv()

async def test_mcp_client():
    """Test the MCP client with OpenAI and Bun support."""
    
    # Check if OpenAI API key is available
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        print("❌ OPENAI_API_KEY not found in environment variables")
        print("Please set your OpenAI API key in the .env file")
        return
    
    print("✅ OpenAI API key found")
    
    # Check if Bun is installed
    try:
        import subprocess
        result = subprocess.run(["bun", "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Bun is installed (version: {result.stdout.strip()})")
        else:
            print("❌ Bun is not installed or not in PATH")
            print("Please install Bun from https://bun.sh/")
            return
    except FileNotFoundError:
        print("❌ Bun is not installed or not in PATH")
        print("Please install Bun from https://bun.sh/")
        return
    
    # Test MCPClient initialization
    try:
        client = MCPClient(openai_api_key=openai_api_key)
        print("✅ MCPClient initialized successfully with OpenAI")
        
        # Clean up
        await client.cleanup()
        print("✅ All tests passed!")
        
    except Exception as e:
        print(f"❌ Error initializing MCPClient: {e}")

if __name__ == "__main__":
    asyncio.run(test_mcp_client())
