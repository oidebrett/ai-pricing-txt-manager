install-backend:
	chmod +x backend/install.sh
	chmod +x backend/run.sh
	chmod +x backend/run_mcp.sh
	cd backend && ./install.sh

install-frontend:
	chmod +x frontend/install.sh
	chmod +x frontend/run.sh
	cd frontend && ./install.sh

install: install-backend install-frontend

# Use PORT environment variable with default of 8003
run-backend:
	cd backend && ./run.sh $(or $(PORT),8003)

# Run the MCP server on port 3001
run-mcp:
	cd backend && ./run_mcp.sh 3001

run-frontend:
	cd frontend && ./run.sh

.DEFAULT_GOAL := install
