import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from "lucide-react"; // Import search icon
import brain from "brain";
import { Product, Discount, CampaignCreationRequest, UserIdentityRule } from "types";
import { toast } from "sonner";

interface HeaderTargetRule {
  headerName: string;
  condition: "equals" | "contains" | "startsWith" | "endsWith" | "matches" | "exists" | "notExists";
  value?: string;
  negate?: boolean;
}

interface CampaignFormData {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: "active" | "paused" | "draft"; // Keep as is for now, API uses string
  productIds: string[];
  discountIds: string[];
  headerTargetRules: HeaderTargetRule[];
}

interface Product {
  id: string | number;
  title: string;
  description?: string;
  price: string;
  vendor?: string;
  product_type?: string;
  handle?: string;
  status?: string;
  inventory_quantity?: number;
  image_url?: string | null;
}

export default function CampaignBuilder() {
  const [formData, setFormData] = useState<CampaignFormData>({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    status: "draft",
    productIds: [],
    discountIds: [],
    headerTargetRules: [],
  });

  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);
  const [availableDiscounts, setAvailableDiscounts] = useState<Discount[]>([]); // New state for discounts
  const [isLoadingDiscounts, setIsLoadingDiscounts] = useState<boolean>(true); // New state for discount loading

  // Add these new states to your component
  const [productSearchQuery, setProductSearchQuery] = useState<string>("");
  const [productsPerPage, setProductsPerPage] = useState<number>(5);
  const [currentProductPage, setCurrentProductPage] = useState<number>(1);

  // Add these new states for discounts
  const [discountSearchQuery, setDiscountSearchQuery] = useState<string>("");
  const [discountsPerPage, setDiscountsPerPage] = useState<number>(5);
  const [currentDiscountPage, setCurrentDiscountPage] = useState<number>(1);

  // Add these states for header targeting
  const [headerTargetRules, setHeaderTargetRules] = useState<HeaderTargetRule[]>([]);
  const [newHeaderRule, setNewHeaderRule] = useState<HeaderTargetRule>({
    headerName: "",
    condition: "equals",
    value: "",
    negate: false
  });

  // Add this filtered products logic
  const filteredProducts = useMemo(() => {
    return availableProducts.filter(product => 
      product.title.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(productSearchQuery.toLowerCase())) ||
      (product.vendor && product.vendor.toLowerCase().includes(productSearchQuery.toLowerCase())) ||
      (product.product_type && product.product_type.toLowerCase().includes(productSearchQuery.toLowerCase()))
    );
  }, [availableProducts, productSearchQuery]);

  // Add this pagination logic
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentProductPage - 1) * productsPerPage;
    return filteredProducts.slice(startIndex, startIndex + productsPerPage);
  }, [filteredProducts, currentProductPage, productsPerPage]);

  // Add these pagination handlers
  const totalProductPages = Math.ceil(filteredProducts.length / productsPerPage);

  const handleNextProductPage = () => {
    if (currentProductPage < totalProductPages) {
      setCurrentProductPage(prev => prev + 1);
    }
  };

  const handlePrevProductPage = () => {
    if (currentProductPage > 1) {
      setCurrentProductPage(prev => prev - 1);
    }
  };

  // Reset to first page when search query changes
  useEffect(() => {
    setCurrentProductPage(1);
  }, [productSearchQuery]);

  // Add this filtered discounts logic
  const filteredDiscounts = useMemo(() => {
    return availableDiscounts.filter(discount => 
      discount.code.toLowerCase().includes(discountSearchQuery.toLowerCase()) ||
      (discount.title && discount.title.toLowerCase().includes(discountSearchQuery.toLowerCase()))
    );
  }, [availableDiscounts, discountSearchQuery]);

  // Add this pagination logic for discounts
  const paginatedDiscounts = useMemo(() => {
    const startIndex = (currentDiscountPage - 1) * discountsPerPage;
    return filteredDiscounts.slice(startIndex, startIndex + discountsPerPage);
  }, [filteredDiscounts, currentDiscountPage, discountsPerPage]);

  // Add these pagination handlers for discounts
  const totalDiscountPages = Math.ceil(filteredDiscounts.length / discountsPerPage);

  const handleNextDiscountPage = () => {
    if (currentDiscountPage < totalDiscountPages) {
      setCurrentDiscountPage(prev => prev + 1);
    }
  };

  const handlePrevDiscountPage = () => {
    if (currentDiscountPage > 1) {
      setCurrentDiscountPage(prev => prev - 1);
    }
  };

  // Reset to first page when search query changes
  useEffect(() => {
    setCurrentDiscountPage(1);
  }, [discountSearchQuery]);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoadingProducts(true);
      try {
        const response = await brain.list_products();
        console.log("Raw products response:", response); // Debug log
        
        if (response.ok) {
          const products = await response.json();
          console.log("Parsed products:", products); // Debug log
          
          // Check if products is an array or if it has a products property
          const productArray = Array.isArray(products) ? products : products.products;
          
          if (productArray && productArray.length > 0) {
            setAvailableProducts(productArray);
          } else {
            console.error("Products data is empty or not in expected format:", products);
            setAvailableProducts([]);
          }
        } else {
          console.error("Failed to fetch products:", response.status, await response.text());
          setAvailableProducts([]);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        setAvailableProducts([]);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => { // New useEffect for fetching discounts
    const fetchDiscounts = async () => {
      setIsLoadingDiscounts(true);
      try {
        const response = await brain.list_discounts();
        console.log("Raw discounts response:", response); // Debug log
        
        if (response.ok) {
          const discounts = await response.json();
          console.log("Parsed discounts:", discounts); // Debug log
          
          // Check if discounts is an array or if it has a discounts property
          const discountArray = Array.isArray(discounts) ? discounts : discounts.discounts;
          
          if (discountArray && discountArray.length > 0) {
            setAvailableDiscounts(discountArray);
          } else {
            console.error("Discounts data is empty or not in expected format:", discounts);
            setAvailableDiscounts([]);
          }
        } else {
          console.error("Failed to fetch discounts:", response.status, await response.text());
          setAvailableDiscounts([]);
        }
      } catch (error) {
        console.error("Error fetching discounts:", error);
        setAvailableDiscounts([]);
      } finally {
        setIsLoadingDiscounts(false);
      }
    };
    fetchDiscounts();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = (value: "active" | "paused" | "draft") => {
    setFormData((prev) => ({ ...prev, status: value }));
  };

  const handleProductSelectionChange = (productId: string) => {
    setFormData((prev) => {
      const newProductIds = prev.productIds.includes(productId)
        ? prev.productIds.filter((id) => id !== productId)
        : [...prev.productIds, productId];
      return { ...prev, productIds: newProductIds };
    });
  };

  const handleDiscountSelectionChange = (discountId: string) => { // New handler for discount selection
    setFormData((prev) => {
      const newDiscountIds = prev.discountIds.includes(discountId)
        ? prev.discountIds.filter((id) => id !== discountId)
        : [...prev.discountIds, discountId];
      return { ...prev, discountIds: newDiscountIds };
    });
  };

  const handleBooleanChange = (field: keyof CampaignFormData, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [field]: checked }));
  };

  const handleAddHeaderRule = () => {
    if (!newHeaderRule.headerName) return;
    
    // For exists/notExists conditions, we don't need a value
    if (newHeaderRule.condition === "exists" || newHeaderRule.condition === "notExists") {
      setHeaderTargetRules([...headerTargetRules, {
        ...newHeaderRule,
        value: undefined
      }]);
    } else if (!newHeaderRule.value) {
      // For other conditions, we need a value
      return;
    } else {
      setHeaderTargetRules([...headerTargetRules, { ...newHeaderRule }]);
    }
    
    // Reset the form
    setNewHeaderRule({
      headerName: "",
      condition: "equals",
      value: "",
      negate: false
    });
  };

  const handleRemoveHeaderRule = (index: number) => {
    const updatedRules = [...headerTargetRules];
    updatedRules.splice(index, 1);
    setHeaderTargetRules(updatedRules);
    
    // Update form data
    setFormData(prev => ({
      ...prev,
      headerTargetRules: updatedRules
    }));
  };

  // Update form data when rules change
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      headerTargetRules
    }));
  }, [headerTargetRules]);

  // Helper function to get human-readable description of a rule
  const getHeaderRuleDescription = (rule: HeaderTargetRule): string => {
    const negation = rule.negate ? "NOT " : "";
    
    switch (rule.condition) {
      case "equals":
        return `${rule.headerName} ${negation}equals "${rule.value}"`;
      case "contains":
        return `${rule.headerName} ${negation}contains "${rule.value}"`;
      case "startsWith":
        return `${rule.headerName} ${negation}starts with "${rule.value}"`;
      case "endsWith":
        return `${rule.headerName} ${negation}ends with "${rule.value}"`;
      case "matches":
        return `${rule.headerName} ${negation}matches pattern "${rule.value}"`;
      case "exists":
        return `${rule.headerName} ${negation}exists`;
      case "notExists":
        return `${rule.headerName} ${negation}does not exist`;
      default:
        return `${rule.headerName} ${rule.condition} ${rule.value}`;
    }
  };

  // Add this state for tracking save success
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Add this state for tracking save operation
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveCampaign = async () => {
    setIsSaving(true);
    console.log("Saving campaign data:", formData);
    
    // Show initial toast to indicate the process has started
    toast.info("Saving campaign...", {
      duration: 2000,
      id: "saving-campaign"
    });

    // Convert header rules to the format expected by the API
    const headerRules = headerTargetRules.map(rule => ({
      header_name: rule.headerName,
      condition: rule.condition,
      value: rule.value,
      negate: rule.negate
    }));

    const campaignData: CampaignCreationRequest = {
      name: formData.name,
      description: formData.description,
      start_date: formData.startDate,
      end_date: formData.endDate,
      status: formData.status,
      product_ids: formData.productIds.map(id => String(id)), // Convert to strings
      discount_ids: formData.discountIds.map(id => String(id)), // Convert to strings
      header_target_rules: headerRules.length > 0 ? headerRules : undefined
    };

    try {
      console.log("Sending campaign data to API:", campaignData);
      
      const response = await brain.create_campaign(campaignData);
      console.log("API response:", response);
      
      if (response.ok) {
        const result = await response.json();
        
        // Show success toast with longer duration
        toast.success("Campaign saved successfully!", {
          duration: 5000,
          id: "campaign-saved"
        });
        
        // Set success state to show the success message
        setSaveSuccess(true);
        
        // Reset success state after a few seconds
        setTimeout(() => {
          setSaveSuccess(false);
        }, 5000);
        
        console.log("Campaign created:", result);
      } else {
        console.error("Response not OK:", response.status);
        const errorText = await response.text();
        console.error("Error response text:", errorText);
        
        try {
          const errorBody = JSON.parse(errorText);
          const errorDetail = typeof errorBody.detail === 'string' ? errorBody.detail : JSON.stringify(errorBody.detail);
          toast.error(`Failed to save campaign: ${response.status} - ${errorDetail}`, {
            duration: 5000,
            id: "campaign-error"
          });
          console.error("Failed to save campaign:", response.status, errorBody);
        } catch (parseError) {
          toast.error(`Failed to save campaign: ${response.status} - ${errorText.substring(0, 100)}`, {
            duration: 5000,
            id: "campaign-error"
          });
        }
      }
    } catch (error) {
      console.error("Exception caught:", error);
      toast.error(`An error occurred while saving the campaign: ${error.message || "Unknown error"}`, {
        duration: 5000,
        id: "campaign-error"
      });
      console.error("Error saving campaign:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <header className="w-full max-w-6xl flex justify-between items-center py-4 mb-8">
        <h1 className="text-3xl font-bold">AI-Pricing-Txt MCP-Server (Shopify)</h1>
        {/* We can add a back button or link to a dashboard here later */}
      </header>
      <main className="w-full max-w-6xl">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl">Create New Campaign</CardTitle>
            <CardDescription>Configure your dynamic pricing campaign.</CardDescription>
          </CardHeader>
          {saveSuccess && (
            <div className="bg-green-800/30 border border-green-500 text-green-300 px-4 py-3 rounded mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Campaign saved successfully! Your changes have been applied.</span>
            </div>
          )}
          <CardContent className="space-y-6">
            {/* Campaign Settings Section */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-lg">Campaign Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., AI Agent Welcome Offer"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-lg">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Briefly describe the campaign's purpose and target."
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            {/* Product Selection Section */}
            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-xl font-semibold mb-3">Select Products for Campaign</h3>
              
              {/* Search and pagination controls */}
              <div className="mb-4 flex flex-col sm:flex-row gap-2 justify-between items-end">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search products..."
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    className="pl-8 bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Select 
                    value={productsPerPage.toString()} 
                    onValueChange={(value) => {
                      setProductsPerPage(parseInt(value));
                      setCurrentProductPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[100px] bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Show" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 text-white border-gray-700">
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="flex items-center gap-1 text-sm text-gray-400">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handlePrevProductPage}
                      disabled={currentProductPage === 1}
                      className="h-8 w-8 p-0 bg-gray-700 border-gray-600 text-white"
                    >
                      &lt;
                    </Button>
                    <span>
                      {currentProductPage} / {totalProductPages || 1}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleNextProductPage}
                      disabled={currentProductPage >= totalProductPages}
                      className="h-8 w-8 p-0 bg-gray-700 border-gray-600 text-white"
                    >
                      &gt;
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Product list */}
              {isLoadingProducts ? (
                <p className="text-gray-400">Loading products...</p>
              ) : filteredProducts.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto p-1 bg-gray-700/30 rounded-md">
                  {paginatedProducts.map((product) => (
                    <div key={product.id} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-700/50">
                      <Checkbox
                        id={`product-${product.id}`}
                        checked={formData.productIds.includes(product.id)}
                        onCheckedChange={() => handleProductSelectionChange(product.id)}
                        className="border-gray-500 data-[state=checked]:bg-sky-500 data-[state=checked]:text-white"
                      />
                      <Label htmlFor={`product-${product.id}`} className="text-base font-normal cursor-pointer">
                        <span className="font-medium">{product.title}</span>
                        {product.description && (
                          <span className="text-sm text-gray-400 block">
                            {product.description.replace(/<\/?[^>]+(>|$)/g, "").substring(0, 50)}
                            {product.description.length > 50 ? "..." : ""}
                          </span>
                        )}
                        <span className="text-sky-400">${product.price}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              ) : productSearchQuery ? (
                <p className="text-gray-400">No products match your search. Try different keywords.</p>
              ) : (
                <p className="text-gray-400">No products available or failed to load. Make sure your API is running and returning products.</p>
              )}
              
              {/* Show count of selected products */}
              {formData.productIds.length > 0 && (
                <p className="mt-2 text-sm text-sky-400">
                  {formData.productIds.length} product{formData.productIds.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            {/* Discount Selection Section */}
            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-xl font-semibold mb-3">Select Discount Codes for Campaign</h3>
              
              {/* Search and pagination controls */}
              <div className="mb-4 flex flex-col sm:flex-row gap-2 justify-between items-end">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search discounts..."
                    value={discountSearchQuery}
                    onChange={(e) => setDiscountSearchQuery(e.target.value)}
                    className="pl-8 bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Select 
                    value={discountsPerPage.toString()} 
                    onValueChange={(value) => {
                      setDiscountsPerPage(parseInt(value));
                      setCurrentDiscountPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[100px] bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Show" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 text-white border-gray-700">
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="flex items-center gap-1 text-sm text-gray-400">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handlePrevDiscountPage}
                      disabled={currentDiscountPage === 1}
                      className="h-8 w-8 p-0 bg-gray-700 border-gray-600 text-white"
                    >
                      &lt;
                    </Button>
                    <span>
                      {currentDiscountPage} / {totalDiscountPages || 1}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleNextDiscountPage}
                      disabled={currentDiscountPage >= totalDiscountPages}
                      className="h-8 w-8 p-0 bg-gray-700 border-gray-600 text-white"
                    >
                      &gt;
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Discount list */}
              {isLoadingDiscounts ? (
                <p className="text-gray-400">Loading discounts...</p>
              ) : filteredDiscounts.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto p-1 bg-gray-700/30 rounded-md">
                  {paginatedDiscounts.map((discount) => (
                    <div key={discount.id} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-700/50">
                      <Checkbox
                        id={`discount-${discount.id}`}
                        checked={formData.discountIds.includes(discount.id)}
                        onCheckedChange={() => handleDiscountSelectionChange(discount.id)}
                        className="border-gray-500 data-[state=checked]:bg-sky-500 data-[state=checked]:text-white"
                      />
                      <Label htmlFor={`discount-${discount.id}`} className="text-base font-normal cursor-pointer">
                        <span className="font-medium">{discount.code}</span>
                        {discount.value_type && discount.value && (
                          <span className="text-green-400 ml-2">
                            {discount.value_type === "percentage" ? `${discount.value}% off` : 
                             discount.value_type === "fixed_amount" ? `$${discount.value} off` : 
                             `${discount.value} ${discount.value_type}`}
                          </span>
                        )}
                        {discount.title && (
                          <span className="text-sm text-gray-400 block">{discount.title}</span>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              ) : discountSearchQuery ? (
                <p className="text-gray-400">No discounts match your search. Try different keywords.</p>
              ) : (
                <p className="text-gray-400">No discounts available or failed to load. Make sure your API is running and returning discounts.</p>
              )}
              
              {/* Show count of selected discounts */}
              {formData.discountIds.length > 0 && (
                <p className="mt-2 text-sm text-green-400">
                  {formData.discountIds.length} discount{formData.discountIds.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            {/* Advanced Targeting Section */}
            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-xl font-semibold mb-4">Advanced Targeting Rules</h3>

              {/* HTTP Header Targeting Section */}
              <div>
                <h4 className="text-lg font-medium mb-4">HTTP Header Targeting</h4>
                <p className="text-sm text-gray-400 mb-4">
                  Target campaigns based on HTTP headers like User-Agent, X-Forwarded-User, etc. 
                  Supports wildcards (*) and regular expressions for flexible matching.
                </p>
                
                {/* Add new header rule form */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4 p-3 bg-gray-800 rounded-md">
                  <div className="md:col-span-3">
                    <Label htmlFor="headerName" className="text-sm text-gray-400 mb-1 block">Header Name</Label>
                    <Input
                      id="headerName"
                      placeholder="e.g., User-Agent"
                      value={newHeaderRule.headerName}
                      onChange={(e) => setNewHeaderRule({...newHeaderRule, headerName: e.target.value})}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="condition" className="text-sm text-gray-400 mb-1 block">Condition</Label>
                    <Select 
                      value={newHeaderRule.condition} 
                      onValueChange={(value: "equals" | "contains" | "startsWith" | "endsWith" | "matches" | "exists" | "notExists") => 
                        setNewHeaderRule({...newHeaderRule, condition: value})
                      }
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 text-white border-gray-700">
                        <SelectItem value="equals">Equals</SelectItem>
                        <SelectItem value="contains">Contains</SelectItem>
                        <SelectItem value="startsWith">Starts with</SelectItem>
                        <SelectItem value="endsWith">Ends with</SelectItem>
                        <SelectItem value="matches">Matches pattern</SelectItem>
                        <SelectItem value="exists">Exists</SelectItem>
                        <SelectItem value="notExists">Does not exist</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="md:col-span-4">
                    {(newHeaderRule.condition !== "exists" && newHeaderRule.condition !== "notExists") && (
                      <>
                        <Label htmlFor="value" className="text-sm text-gray-400 mb-1 block">Value</Label>
                        <Input
                          id="value"
                          placeholder={newHeaderRule.condition === "matches" ? "e.g., .*Bot.*" : "e.g., ChatGPT*"}
                          value={newHeaderRule.value}
                          onChange={(e) => setNewHeaderRule({...newHeaderRule, value: e.target.value})}
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </>
                    )}
                  </div>
                  
                  <div className="md:col-span-2 flex items-end">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="negateRule"
                        checked={newHeaderRule.negate}
                        onCheckedChange={(checked) => setNewHeaderRule({...newHeaderRule, negate: !!checked})}
                        className="border-gray-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
                      />
                      <Label htmlFor="negateRule" className="text-sm text-gray-300">
                        Negate
                      </Label>
                    </div>
                  </div>
                  
                  <div className="md:col-span-1 flex items-end">
                    <Button 
                      onClick={handleAddHeaderRule}
                      disabled={!newHeaderRule.headerName || ((newHeaderRule.condition !== "exists" && newHeaderRule.condition !== "notExists") && !newHeaderRule.value)}
                      className="w-full bg-sky-500 hover:bg-sky-600"
                    >
                      Add
                    </Button>
                  </div>
                </div>
                
                {/* Header rules list */}
                {headerTargetRules.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    <h4 className="text-md font-medium text-gray-300">Active Header Rules</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto p-2 bg-gray-700/30 rounded-md">
                      {headerTargetRules.map((rule, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-800 rounded">
                          <span className="text-sm">{getHeaderRuleDescription(rule)}</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleRemoveHeaderRule(index)}
                            className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-red-900/30"
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic mb-4">No header targeting rules added. Campaign will target all traffic.</p>
                )}
                
                {/* Common header examples */}
                <div className="mt-4 p-3 bg-gray-800/50 rounded-md">
                  <h4 className="text-md font-medium text-gray-300 mb-2">Common Header Targeting Examples</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setNewHeaderRule({
                        headerName: "User-Agent",
                        condition: "contains",
                        value: "Bot",
                        negate: false
                      })}
                      className="justify-start text-left bg-gray-700/30 border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      Target bot traffic (User-Agent contains "Bot")
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setNewHeaderRule({
                        headerName: "User-Agent",
                        condition: "contains",
                        value: "Bot",
                        negate: true
                      })}
                      className="justify-start text-left bg-gray-700/30 border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      Exclude bot traffic (User-Agent NOT contains "Bot")
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setNewHeaderRule({
                        headerName: "X-Forwarded-User",
                        condition: "exists",
                        negate: false
                      })}
                      className="justify-start text-left bg-gray-700/30 border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      Target authenticated users (X-Forwarded-User exists)
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setNewHeaderRule({
                        headerName: "X-Forwarded-User",
                        condition: "exists",
                        negate: true
                      })}
                      className="justify-start text-left bg-gray-700/30 border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      Target anonymous users (X-Forwarded-User NOT exists)
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setNewHeaderRule({
                        headerName: "User-Agent",
                        condition: "matches",
                        value: ".*(ChatGPT|Claude|Bard).*",
                        negate: false
                      })}
                      className="justify-start text-left bg-gray-700/30 border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      Target AI agents (regex pattern)
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setNewHeaderRule({
                        headerName: "Authorization",
                        condition: "exists",
                        negate: false
                      })}
                      className="justify-start text-left bg-gray-700/30 border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      Target authenticated requests (Authorization exists)
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Campaign Dates & Status Section -- REPLACED */}
            <div className="border-t border-gray-700 pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-lg">Start Date</Label>
                <Input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate" className="text-lg">End Date</Label>
                <Input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status" className="text-lg">Status</Label>
                <Select value={formData.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 text-white border-gray-700">
                    <SelectItem value="draft" className="hover:bg-gray-700">Draft</SelectItem>
                    <SelectItem value="active" className="hover:bg-gray-700">Active</SelectItem>
                    <SelectItem value="paused" className="hover:bg-gray-700">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

          </CardContent>
          <CardFooter className="border-t border-gray-700 pt-6">
            <Button 
              onClick={handleSaveCampaign} 
              size="lg" 
              className="bg-sky-500 hover:bg-sky-600"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Campaign'
              )}
            </Button>
          </CardFooter>
        </Card>
      </main>
      {saveSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-800 border border-green-500 text-green-100 px-6 py-4 rounded-lg shadow-lg z-50 flex items-center max-w-md animate-in slide-in-from-bottom-5">
          <svg className="w-6 h-6 mr-3 text-green-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-medium">Campaign saved successfully!</p>
            <p className="text-sm text-green-200 mt-1">Your changes have been applied.</p>
          </div>
        </div>
      )}
    </div>
  );
}

