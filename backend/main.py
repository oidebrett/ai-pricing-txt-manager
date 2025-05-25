import os
import json
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import dotenv
from ensure_data_dir import ensure_data_directory

# Add this class for datetime serialization
class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

# Ensure data directory exists
data_dir = ensure_data_directory()

# Load environment variables
dotenv.load_dotenv()

app = FastAPI(title="AI Pricing Backend")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Explicitly allow the frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class Product(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    price: str
    vendor: Optional[str] = None
    product_type: Optional[str] = None
    handle: Optional[str] = None
    status: Optional[str] = None
    inventory_quantity: Optional[int] = None
    image_url: Optional[str] = None

class Discount(BaseModel):
    id: int
    code: str
    value_type: str  # percentage, fixed_amount, etc.
    value: str  # "-30.0" for 30% off
    title: Optional[str] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    usage_count: Optional[int] = None
    target_type: Optional[str] = None  # line_item, shipping_line

class HeaderTargetRule(BaseModel):
    header_name: str
    condition: str  # equals, contains, startsWith, endsWith, matches, exists, notExists
    value: Optional[str] = None
    negate: Optional[bool] = False

class DetailedProduct(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    original_price: float
    discounted_price: float
    discount_percentage: float
    vendor: Optional[str] = None
    product_type: Optional[str] = None
    handle: Optional[str] = None
    status: Optional[str] = None
    inventory_quantity: Optional[int] = None
    image_url: Optional[str] = None

class DetailedDiscount(BaseModel):
    id: int
    code: str
    value_type: str
    value: str
    title: Optional[str] = None
    starts_at: Optional[str] = None
    ends_at: Optional[str] = None
    usage_count: Optional[int] = None
    target_type: Optional[str] = None

class AIAgentMetadata(BaseModel):
    campaign_type: str
    target_audience: str
    detection_method: str
    eligible_agents: List[str] = []
    created_at: str
    last_updated: str

class Campaign(BaseModel):
    id: Optional[str] = None
    name: str
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: str  # draft, active, inactive
    product_ids: List[int] = []
    discount_ids: List[int] = []
    header_target_rules: Optional[List[HeaderTargetRule]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    detailed_products: Optional[List[DetailedProduct]] = None
    detailed_discounts: Optional[List[DetailedDiscount]] = None
    ai_agent_metadata: Optional[AIAgentMetadata] = None

class ListProductsData(BaseModel):
    products: List[Product]

class ListDiscountsData(BaseModel):
    discounts: List[Discount]

class ListCampaignsData(BaseModel):
    campaigns: List[Campaign]

# Shopify API client
class ShopifyClient:
    def __init__(self):
        self.shop_url = os.getenv("SHOPIFY_SHOP_URL")
        self.access_token = os.getenv("SHOPIFY_ACCESS_TOKEN")
        self.api_version = os.getenv("SHOPIFY_API_VERSION", "2023-10")
        
        if not self.shop_url or not self.access_token:
            raise ValueError("SHOPIFY_SHOP_URL and SHOPIFY_ACCESS_TOKEN must be set in .env file")
        
        self.base_url = f"https://{self.shop_url}/admin/api/{self.api_version}"
        self.headers = {"X-Shopify-Access-Token": self.access_token}
    
    async def get_products(self) -> List[Product]:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}/products.json", headers=self.headers)
            response.raise_for_status()
            data = response.json()
            
            products = []
            for product_data in data.get("products", []):
                # Extract the main variant price
                price = "0.00"
                inventory_quantity = 0
                if product_data.get("variants") and len(product_data["variants"]) > 0:
                    price = product_data["variants"][0].get("price", "0.00")
                    inventory_quantity = product_data["variants"][0].get("inventory_quantity", 0)
                
                # Extract image URL if available
                image_url = None
                if product_data.get("image") and product_data["image"].get("src"):
                    image_url = product_data["image"]["src"]
                
                products.append(Product(
                    id=product_data["id"],
                    title=product_data["title"],
                    description=product_data.get("body_html", ""),
                    price=price,
                    vendor=product_data.get("vendor"),
                    product_type=product_data.get("product_type"),
                    handle=product_data.get("handle"),
                    status=product_data.get("status"),
                    inventory_quantity=inventory_quantity,
                    image_url=image_url
                ))
            
            return products
    
    async def get_discounts(self) -> List[Discount]:
        # First get price rules
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}/price_rules.json", headers=self.headers)
            response.raise_for_status()
            price_rules_data = response.json()
            
            discounts = []
            for rule in price_rules_data.get("price_rules", []):
                # Get discount codes for this price rule
                discount_response = await client.get(
                    f"{self.base_url}/price_rules/{rule['id']}/discount_codes.json", 
                    headers=self.headers
                )
                discount_response.raise_for_status()
                discount_codes = discount_response.json().get("discount_codes", [])
                
                for code in discount_codes:
                    discounts.append(Discount(
                        id=code["id"],
                        code=code["code"],
                        value_type=rule["value_type"],
                        value=rule["value"],
                        title=rule.get("title"),
                        starts_at=rule.get("starts_at"),
                        ends_at=rule.get("ends_at"),
                        usage_count=code.get("usage_count"),
                        target_type=rule.get("target_type")
                    ))
            
            return discounts

# Campaign storage
class CampaignStorage:
    def __init__(self, file_path="../data/campaign.json"):
        self.file_path = file_path
        self._ensure_file_exists()
    
    def _ensure_file_exists(self):
        # Ensure the directory exists
        os.makedirs(os.path.dirname(self.file_path), exist_ok=True)
        if not os.path.exists(self.file_path):
            with open(self.file_path, "w") as f:
                json.dump({"campaign": {}}, f)
    
    def load_campaign(self) -> Dict[str, Any]:
        with open(self.file_path, "r") as f:
            data = json.load(f)
            return data.get("campaign", {})
    
    def save_campaign(self, campaign: Dict[str, Any]):
        with open(self.file_path, "w") as f:
            # Use the custom encoder for datetime objects
            json.dump({"campaign": campaign}, f, cls=DateTimeEncoder)
    
    def get_campaign(self) -> Optional[Dict[str, Any]]:
        campaign = self.load_campaign()
        if not campaign:
            return None
        return campaign
    
    def add_campaign(self, campaign: Dict[str, Any]):
        # Set a fixed ID
        campaign["id"] = "current_campaign"
        # Add timestamps
        now = datetime.now().isoformat()
        campaign["created_at"] = now
        campaign["updated_at"] = now
        # Save the campaign (overwriting any existing one)
        self.save_campaign(campaign)
        return campaign
    
    def update_campaign(self, campaign_id: str, updated_campaign: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        # Ignore campaign_id since we only have one campaign
        updated_campaign["id"] = "current_campaign"
        updated_campaign["created_at"] = self.load_campaign().get("created_at", datetime.now().isoformat())
        updated_campaign["updated_at"] = datetime.now().isoformat()
        self.save_campaign(updated_campaign)
        return updated_campaign
    
    def delete_campaign(self, campaign_id: str) -> bool:
        # Clear the campaign by saving an empty object
        self.save_campaign({})
        return True

# Initialize clients
shopify_client = ShopifyClient()
campaign_storage = CampaignStorage(os.path.join(data_dir, "campaign.json"))

# API Routes
@app.get("/_healthz", response_model=Dict[str, str])
async def check_health():
    return {"status": "ok"}

@app.get("/routes/api/products", response_model=ListProductsData)
async def list_products():
    try:
        products = await shopify_client.get_products()
        print(f"Returning {len(products)} products") # Debug log
        return {"products": products}
    except Exception as e:
        print(f"Error fetching products: {str(e)}") # Debug log
        raise HTTPException(status_code=500, detail=f"Failed to fetch products: {str(e)}")

@app.get("/routes/api/discounts", response_model=ListDiscountsData)
async def list_discounts():
    try:
        discounts = await shopify_client.get_discounts()
        print(f"Returning {len(discounts)} discounts") # Debug log
        return {"discounts": discounts}
    except Exception as e:
        print(f"Error fetching discounts: {str(e)}") # Debug log
        raise HTTPException(status_code=500, detail=f"Failed to fetch discounts: {str(e)}")

@app.get("/routes/api/campaigns", response_model=ListCampaignsData)
async def list_campaigns():
    campaign = campaign_storage.get_campaign()
    campaigns = [campaign] if campaign else []
    return {"campaigns": campaigns}

@app.get("/routes/api/campaigns/{campaign_id}", response_model=Campaign)
async def get_campaign(campaign_id: str):
    campaign = campaign_storage.get_campaign()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign

@app.post("/routes/api/campaigns", response_model=Campaign)
async def create_campaign(campaign: Campaign):
    try:
        print(f"Received campaign creation request: {campaign}")
        
        # Enrich the campaign with detailed product and discount information
        enriched_campaign = await enrich_campaign_data(campaign)
        
        created_campaign = campaign_storage.add_campaign(enriched_campaign.model_dump())
        print(f"Campaign created successfully: {created_campaign}")
        return created_campaign
    except Exception as e:
        print(f"Error creating campaign: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create campaign: {str(e)}")

@app.put("/routes/api/campaigns/{campaign_id}", response_model=Campaign)
async def update_campaign(campaign_id: str, campaign: Campaign):
    # Enrich the campaign with detailed product and discount information
    enriched_campaign = await enrich_campaign_data(campaign)
    
    updated_campaign = campaign_storage.update_campaign(campaign_id, enriched_campaign.model_dump())
    if not updated_campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return updated_campaign

@app.delete("/routes/api/campaigns/{campaign_id}", response_model=Dict[str, bool])
async def delete_campaign(campaign_id: str):
    success = campaign_storage.delete_campaign(campaign_id)
    if not success:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"success": True}

@app.get("/routes/api/test", response_model=Dict[str, str])
async def test_endpoint():
    return {"status": "ok", "message": "API connection working"}

async def enrich_campaign_data(campaign: Campaign) -> Campaign:
    """Enrich campaign data with detailed product and discount information."""
    campaign_dict = campaign.model_dump()
    
    # Add detailed product information
    if campaign.product_ids:
        products = []
        try:
            all_products = await shopify_client.get_products()
            product_map = {str(p.id): p for p in all_products}
            
            for product_id in campaign.product_ids:
                product_id_str = str(product_id)
                if product_id_str in product_map:
                    product = product_map[product_id_str]
                    # Calculate discounted price if there are discounts
                    original_price = float(product.price)
                    discounted_price = original_price
                    discount_percentage = 0.0
                    
                    # Apply discounts if available
                    if campaign.discount_ids:
                        discounts = await shopify_client.get_discounts()
                        for discount in discounts:
                            if discount.id in campaign.discount_ids:
                                if discount.value_type == "percentage":
                                    # Fix: The value is negative (e.g., "-30.0"), so we need to handle it correctly
                                    discount_value = float(discount.value)
                                    # If the value is negative, it's already in the right format
                                    # If it's positive, we need to negate it for the calculation
                                    if discount_value > 0:
                                        discount_value = -discount_value
                                    
                                    # Calculate the discount percentage (as a positive number for display)
                                    discount_percentage = abs(discount_value)
                                    
                                    # Apply the discount to the price
                                    discounted_price = original_price * (1 + (discount_value / 100))
                                elif discount.value_type == "fixed_amount":
                                    # Fix: The value might be negative (e.g., "-10.0")
                                    discount_value = float(discount.value)
                                    # If the value is negative, it's already in the right format
                                    # If it's positive, we need to negate it for the calculation
                                    if discount_value > 0:
                                        discount_value = -discount_value
                                    
                                    # Apply the discount to the price
                                    discounted_price = max(0, original_price + discount_value)
                                    
                                    # Calculate the discount percentage
                                    discount_percentage = abs((discount_value / original_price) * 100) if original_price > 0 else 0
                    
                    products.append({
                        "id": product.id,
                        "title": product.title,
                        "description": product.description,
                        "original_price": original_price,
                        "discounted_price": round(discounted_price, 2),
                        "discount_percentage": round(discount_percentage, 2),
                        "vendor": product.vendor,
                        "product_type": product.product_type,
                        "handle": product.handle,
                        "status": product.status,
                        "inventory_quantity": product.inventory_quantity,
                        "image_url": product.image_url
                    })
            
            campaign_dict["detailed_products"] = products
        except Exception as e:
            print(f"Error enriching product data: {str(e)}")
            campaign_dict["detailed_products"] = []
    
    # Add detailed discount information
    if campaign.discount_ids:
        detailed_discounts = []
        try:
            all_discounts = await shopify_client.get_discounts()
            for discount in all_discounts:
                if discount.id in campaign.discount_ids:
                    detailed_discounts.append({
                        "id": discount.id,
                        "code": discount.code,
                        "value_type": discount.value_type,
                        "value": discount.value,
                        "title": discount.title,
                        "starts_at": discount.starts_at.isoformat() if discount.starts_at else None,
                        "ends_at": discount.ends_at.isoformat() if discount.ends_at else None,
                        "usage_count": discount.usage_count,
                        "target_type": discount.target_type
                    })
            
            campaign_dict["detailed_discounts"] = detailed_discounts
        except Exception as e:
            print(f"Error enriching discount data: {str(e)}")
            campaign_dict["detailed_discounts"] = []
    
    # Add campaign metadata for AI agents
    campaign_dict["ai_agent_metadata"] = {
        "campaign_type": "dynamic_pricing",
        "target_audience": "ai_agents",
        "detection_method": "header_analysis",
        "eligible_agents": extract_agent_names_from_rules(campaign.header_target_rules) if campaign.header_target_rules else [],
        "created_at": datetime.now().isoformat(),
        "last_updated": datetime.now().isoformat()
    }
    
    return Campaign(**campaign_dict)

def extract_agent_names_from_rules(rules: List[HeaderTargetRule]) -> List[str]:
    """Extract AI agent names from header target rules."""
    agent_names = []
    
    if not rules:
        return agent_names
    
    for rule in rules:
        if rule.header_name.lower() == "user-agent" and rule.condition == "matches":
            # Try to extract agent names from regex patterns
            pattern = rule.value or ""
            # Look for common patterns like (ChatGPT|Claude|Bard)
            import re
            matches = re.findall(r'\((.*?)\)', pattern)
            for match in matches:
                agents = match.split('|')
                agent_names.extend([a.strip() for a in agents if a.strip()])
    
    return agent_names

if __name__ == "__main__":
    import uvicorn
    import sys
    
    # Get port from command line argument or use default
    port = 8003
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"Invalid port: {sys.argv[1]}. Using default port 8001.")
    
    uvicorn.run(app, host="0.0.0.0", port=port)
