# MCP Client in Python with FastAPI

This repository contains a complete tutorial on how to create an MCP (Model Context Protocol) client in Python using FastAPI. The client now uses OpenAI's GPT models instead of Anthropic's Claude, and supports Bun runtime for JavaScript MCP servers.

## Features

- Build an MCP client using Python and FastAPI.
- Integrate OpenAI's GPT models to interact with MCP tools.
- Support for both Python and JavaScript MCP servers (using Bun for JS).
- Fetch and display results from an MCP server.
- Step-by-step guidance for setting up and running the client.

## Prerequisites

- Python 3.11 or higher
- Bun runtime (for JavaScript MCP servers)
- OpenAI API key
- Basic knowledge of FastAPI and REST APIs
- An MCP server setup

## Getting Started

### 1. Environment Setup

Copy the example environment file and configure your settings:
```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:
```env
OPENAI_API_KEY=your_openai_api_key_here
SERVER_SCRIPT_PATH=/path/to/your/mcp/server/script.js
```

### 2. Clone the Repository and Install Dependencies
  ```bash
  git clone git@github.com:alejandro-ao/mcp-client-python.git
  cd mcp-client-python
  ```

2. **Install Dependencies**:
  ```bash
  pip install -r requirements.txt
  ```

3. **Set Up Environment Variables**:
Create a `.env` file in the root directory and add your API keys. In this example, I added the `SERPER_API_KEY` because it is used in the MCP server file, which we built in the [previous tutorial](https://github.com/alejandro-ao/mcp-server-example). And since we are running everything locally, we can set all the environment variables (for both serverand client) in the same file. In a more complex setup, you would deploy your MCP server separately and set the environment variables accordingly.

  ```env
  ANTHROPIC_API_KEY=
  SERPER_API_KEY=
  ```

5. **Run the Application**:
  ```bash
  uvicorn main:app --reload
  ```

1. **Access the API**:
  Open your browser and navigate to `http://127.0.0.1:8000/docs` to explore the API documentation.

## Tutorial Overview

1. **Setting Up FastAPI**:
  Learn how to create a FastAPI application and define endpoints.

2. **Connecting to the MCP Server**:
  Understand how to make requests to the MCP server and handle responses.

3. **Integrating LLMs**:
  Explore how to use an LLM to call MCP tools dynamically.

4. **Displaying Results**:
  Implement logic to process and display results from the MCP tools.

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [MCP Documentation](https://modelcontextprotocol.io/quickstart/client) (for inspiration)

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

Special thanks to the creators of FastAPI and the Claude Desktop application for their inspiration.
