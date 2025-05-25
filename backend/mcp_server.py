import contextlib
import json
import logging
import os
from http import HTTPStatus
from uuid import uuid4
from datetime import datetime
import re

import anyio
import click
import mcp.types as types
from mcp.server.lowlevel import Server
from mcp.server.streamable_http import (
    MCP_SESSION_ID_HEADER,
    StreamableHTTPServerTransport,
)
from pydantic import AnyUrl
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import Response
from starlette.routing import Mount

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Global task group that will be initialized in the lifespan
task_group = None

# Simple in-memory event store for resumability
class InMemoryEventStore:
    def __init__(self):
        self.events = {}
        
    async def store_event(self, event_id, event_data):
        self.events[event_id] = event_data
        
    async def get_events_after(self, last_event_id):
        if not last_event_id or last_event_id not in self.events:
            return []
        
        event_ids = sorted(self.events.keys())
        try:
            idx = event_ids.index(last_event_id)
            return [self.events[eid] for eid in event_ids[idx+1:]]
        except ValueError:
            return []

# Create event store instance
event_store = InMemoryEventStore()

@contextlib.asynccontextmanager
async def lifespan(app):
    """Application lifespan context manager for managing task group."""
    global task_group

    async with anyio.create_task_group() as tg:
        task_group = tg
        logger.info("Application started, task group initialized!")
        try:
            yield
        finally:
            logger.info("Application shutting down, cleaning up resources...")
            if task_group:
                tg.cancel_scope.cancel()
                task_group = None
            logger.info("Resources cleaned up successfully.")

def load_campaign_data(data_dir: str = "../data") -> dict:
    """Load campaign data from JSON file."""
    try:
        campaign_path = os.path.join(data_dir, "campaign.json")
        if not os.path.exists(campaign_path):
            logger.warning(f"Campaign file not found at {campaign_path}")
            return None
        
        with open(campaign_path, "r") as f:
            data = json.load(f)
            return data.get("campaign")
    except Exception as e:
        logger.error(f"Error loading campaign data: {str(e)}")
        return None

def is_campaign_active(campaign: dict) -> bool:
    """Check if campaign is active based on status and dates."""
    if not campaign or campaign.get("status") != "active":
        return False
    
    now = datetime.now()
    
    # Check start date if it exists
    start_date_str = campaign.get("start_date")
    if start_date_str:
        try:
            start_date = datetime.fromisoformat(start_date_str.replace("Z", "+00:00"))
            if now < start_date:
                logger.info(f"Campaign not started yet. Current: {now}, Start: {start_date}")
                return False
        except (ValueError, TypeError) as e:
            logger.warning(f"Invalid start date format: {e}")
    
    # Check end date if it exists
    end_date_str = campaign.get("end_date")
    if end_date_str:
        try:
            end_date = datetime.fromisoformat(end_date_str.replace("Z", "+00:00"))
            if now > end_date:
                logger.info(f"Campaign already ended. Current: {now}, End: {end_date}")
                return False
        except (ValueError, TypeError) as e:
            logger.warning(f"Invalid end date format: {e}")
    
    return True

def check_header_rule(rule: dict, headers: dict) -> bool:
    """Check if a header rule matches the provided headers."""
    # Extract rule components, using lowercase for case-insensitive comparison
    header_name = rule.get("header_name", "").lower()
    condition = rule.get("condition", "")
    value = rule.get("value", "")
    negate = rule.get("negate", False)
    
    # Log the full headers for debugging
    logger.info(f"All headers received: {headers}")
    logger.info(f"Checking header rule: {rule}")
    
    # Convert all header keys to lowercase for case-insensitive matching
    lowercase_headers = {k.lower(): v for k, v in headers.items()}
    
    # Get the header value using case-insensitive matching
    header_value = lowercase_headers.get(header_name)
    
    logger.info(f"Header '{header_name}' value: {header_value}")
    
    # For exists/notExists conditions, we only care if the header is present
    if condition == "exists":
        result = header_name in lowercase_headers
        logger.info(f"Exists check for '{header_name}': {result}")
    elif condition == "notExists":
        result = header_name not in lowercase_headers
    # For other conditions, we need both the header and the value
    elif header_name not in lowercase_headers:
        result = False
    elif condition == "equals":
        result = lowercase_headers[header_name] == value
    elif condition == "contains":
        result = value in lowercase_headers[header_name]
    elif condition == "startsWith":
        result = lowercase_headers[header_name].startswith(value)
    elif condition == "endsWith":
        result = lowercase_headers[header_name].endswith(value)
    elif condition == "matches":
        try:
            result = bool(re.search(value, lowercase_headers[header_name]))
        except re.error:
            logger.warning(f"Invalid regex pattern: {value}")
            result = False
    else:
        logger.warning(f"Unknown condition: {condition}")
        result = False
    
    # Apply negation if needed
    final_result = not result if negate else result
    logger.info(f"Rule result before negation: {result}, after negation: {final_result}")
    
    return final_result

def check_header_targeting(campaign: dict, headers: dict) -> bool:
    """Check if the request headers match the campaign targeting rules."""
    # If no header rules, campaign applies to all
    header_rules = campaign.get("header_target_rules", [])
    
    # Also check for headerTargetRules (camelCase) for flexibility
    if not header_rules:
        header_rules = campaign.get("headerTargetRules", [])
    
    if not header_rules:
        logger.debug("No header targeting rules found, allowing all traffic")
        return True
    
    logger.debug(f"Checking {len(header_rules)} header targeting rules")
    
    # Check each rule - all rules must match (AND logic)
    for rule in header_rules:
        if not check_header_rule(rule, headers):
            logger.info(f"Header rule not matched: {rule}")
            return False
    
    logger.info("All header targeting rules matched")
    return True

@click.command()
@click.option("--port", default=3001, help="Port to listen on for HTTP")
@click.option("--data-dir", default="../data", help="Directory containing campaign.json file")
@click.option(
    "--log-level",
    default="INFO",
    help="Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)",
)
@click.option(
    "--json-response",
    is_flag=True,
    default=False,
    help="Enable JSON responses instead of SSE streams",
)
def main(port: int, data_dir: str, log_level: str, json_response: bool) -> int:
    # Configure logging
    logging.basicConfig(
        level=getattr(logging, log_level.upper()),
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    app = Server("ai-pricing-mcp-server")
    
    @app.call_tool()
    async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
        ctx = app.request_context
        # Reload campaign data on each request to get the latest
        campaign = load_campaign_data(data_dir)
        
        # Get request headers from context
        request_headers = {}
        
        # Try different ways to access headers
        if hasattr(app, 'headers'):
            # Get headers from app context
            request_headers = app.headers
            logger.info(f"Using headers from app context: {request_headers}")
        elif hasattr(ctx, 'request') and hasattr(ctx.request, 'headers'):
            # Standard way - convert headers to a dictionary
            request_headers = dict(ctx.request.headers.items())
        elif hasattr(ctx, 'request') and hasattr(ctx.request, 'scope') and 'headers' in ctx.request.scope:
            # ASGI scope way - headers are in the scope
            request_headers = {k.decode('utf-8').lower(): v.decode('utf-8') 
                              for k, v in ctx.request.scope['headers']}
        elif hasattr(ctx, 'request') and hasattr(ctx.request, 'scope') and 'original_headers' in ctx.request.scope:
            # Get our stored headers
            request_headers = ctx.request.scope['original_headers']
        elif hasattr(ctx, 'scope') and 'original_headers' in ctx.scope:
            # Direct scope access to our stored headers
            request_headers = ctx.scope['original_headers']
        
        # Log all headers for debugging
        logger.info(f"Request headers extracted: {request_headers}")
        
        # Check for authorization header specifically
        auth_header = next((v for k, v in request_headers.items() 
                           if k.lower() == 'authorization'), None)
        logger.info(f"Authorization header found: {auth_header is not None}")
        
        # Check if campaign is active and targeting matches
        campaign_active = is_campaign_active(campaign)
        targeting_matched = check_header_targeting(campaign, request_headers)
        
        # Log the targeting results
        logger.info(f"Campaign active: {campaign_active}, Targeting matched: {targeting_matched}")
        
        # If campaign is not active or targeting doesn't match, return standard message
        if not campaign_active or not targeting_matched:
            no_pricing_msg = "We don't have any special pricing available for you at this time."
            
            # Send notification about the rejection
            async def send_notification():
                reason = "inactive campaign" if not campaign_active else "targeting mismatch"
                await ctx.session.send_log_message(
                    level="info",
                    data=f"Pricing request denied: {reason}",
                    logger="pricing_service",
                    related_request_id=ctx.request_id,
                )
                
            if task_group:
                task_group.start_soon(send_notification)
                
            return [types.TextContent(type="text", text=json.dumps({"message": no_pricing_msg}))]
        
        # Process the tool call if campaign is active and targeting matches
        if name == "get-products":
            return handle_get_products(campaign, ctx)
        elif name == "get-discount":
            product_id = arguments.get("product_id")
            return handle_get_discount(campaign, product_id, ctx)
        else:
            return [types.TextContent(type="text", text=f"Unknown tool: {name}")]
    
    def handle_get_products(campaign: dict, ctx) -> list[types.TextContent]:
        products = campaign.get("detailed_products", [])
        
        # Send notification about products retrieval
        async def send_notification():
            await ctx.session.send_log_message(
                level="info",
                data=f"Retrieved {len(products)} products from active campaign",
                logger="pricing_service",
                related_request_id=ctx.request_id,
            )
            # Notify about resource update
            await ctx.session.send_resource_updated(uri=AnyUrl("http:///products"))
            
        if task_group:
            task_group.start_soon(send_notification)
            
        return [types.TextContent(type="text", text=json.dumps({"products": products}))]
    
    def handle_get_discount(campaign: dict, product_id: str, ctx) -> list[types.TextContent]:
        products = campaign.get("detailed_products", [])
        discounts = campaign.get("detailed_discounts", [])
        
        # Find the product
        product = next((p for p in products if str(p.get("id")) == str(product_id)), None)
        if not product:
            return [types.TextContent(type="text", text=json.dumps({"error": "Product not found"}))]
        
        # Get the first discount code
        discount = discounts[0] if discounts else None
        if not discount:
            return [types.TextContent(type="text", text=json.dumps({"error": "No discount available"}))]
        
        result = {
            "product": product,
            "discount_code": discount.get("code"),
            "discount_percentage": product.get("discount_percentage")
        }
        
        # Send notification about discount retrieval
        async def send_notification():
            await ctx.session.send_log_message(
                level="info",
                data=f"Retrieved discount for product {product_id}: {discount.get('code')}",
                logger="pricing_service",
                related_request_id=ctx.request_id,
            )
            # Notify about resource update
            await ctx.session.send_resource_updated(uri=AnyUrl(f"http:///discount/{product_id}"))
            
        if task_group:
            task_group.start_soon(send_notification)
        
        return [types.TextContent(type="text", text=json.dumps(result))]
    
    @app.list_tools()
    async def list_tools() -> list[types.Tool]:
        return [
            types.Tool(
                name="get-products",
                description="Get all products in the active campaign",
                inputSchema={"type": "object", "properties": {}}
            ),
            types.Tool(
                name="get-discount",
                description="Get discount code for a specific product",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "product_id": {
                            "type": "string",
                            "description": "ID of the product to get discount for"
                        }
                    },
                    "required": ["product_id"]
                }
            )
        ]
    
    # We need to store the server instances between requests
    server_instances = {}
    # Lock to prevent race conditions when creating new sessions
    session_creation_lock = anyio.Lock()

    # ASGI handler for streamable HTTP connections
    async def handle_streamable_http(scope, receive, send):
        request = Request(scope, receive)
        request_mcp_session_id = request.headers.get(MCP_SESSION_ID_HEADER)
        
        # Log all headers for debugging - both as dict and raw from scope
        logger.info(f"Incoming request headers (dict): {dict(request.headers)}")
        if 'headers' in scope:
            raw_headers = [(k.decode('utf-8'), v.decode('utf-8')) for k, v in scope['headers']]
            logger.info(f"Incoming request raw headers from scope: {raw_headers}")
        
        if (
            request_mcp_session_id is not None
            and request_mcp_session_id in server_instances
        ):
            transport = server_instances[request_mcp_session_id]
            logger.debug("Session already exists, handling request directly")
            await transport.handle_request(scope, receive, send)
        elif request_mcp_session_id is None:
            # try to establish new session
            logger.debug("Creating new transport")
            # Use lock to prevent race conditions when creating new sessions
            async with session_creation_lock:
                new_session_id = uuid4().hex
                http_transport = StreamableHTTPServerTransport(
                    mcp_session_id=new_session_id,
                    is_json_response_enabled=json_response,
                    event_store=event_store,  # Enable resumability
                )
                server_instances[http_transport.mcp_session_id] = http_transport
                logger.info(f"Created new transport with session ID: {new_session_id}")

                async def run_server(task_status=None):
                    async with http_transport.connect() as streams:
                        read_stream, write_stream = streams
                        if task_status:
                            task_status.started()
                        
                        # Store headers in app context
                        app.headers = dict(request.headers)
                        logger.info(f"Stored headers in app context: {app.headers}")
                        
                        await app.run(
                            read_stream,
                            write_stream,
                            app.create_initialization_options(),
                        )

                if not task_group:
                    raise RuntimeError("Task group is not initialized")

                await task_group.start(run_server)

                # Store the original headers in the scope for later access
                if 'headers' in scope:
                    # Store headers in a format that can be easily accessed later
                    scope['original_headers'] = dict(request.headers)
                    logger.info(f"Stored original headers in scope: {scope['original_headers']}")

                # Handle the HTTP request and return the response
                await http_transport.handle_request(scope, receive, send)
        else:
            response = Response(
                "Bad Request: No valid session ID provided",
                status_code=HTTPStatus.BAD_REQUEST,
            )
            await response(scope, receive, send)

    # Create an ASGI application using the transport
    starlette_app = Starlette(
        debug=True,
        routes=[
            Mount("/mcp", app=handle_streamable_http),
        ],
        lifespan=lifespan,
    )

    # Start the server
    logger.info(f"Starting MCP server on port {port}")
    import uvicorn
    uvicorn.run(starlette_app, host="0.0.0.0", port=port)
    
    return 0

if __name__ == "__main__":
    main()
