#!/bin/bash

# Activate virtual environment
source .venv/bin/activate

# Default port
PORT=${1:-8003}

# Run the FastAPI server
echo "Starting server on port $PORT..."
python main.py $PORT
