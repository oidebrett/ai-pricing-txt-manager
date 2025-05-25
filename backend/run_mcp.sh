#!/bin/bash

# Activate virtual environment
source .venv/bin/activate

# Default port
PORT=${1:-3001}

# Run the MCP server
echo "Starting MCP server on port $PORT..."
python mcp_server.py --port $PORT