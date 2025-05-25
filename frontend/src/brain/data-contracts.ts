/** Campaign */
export interface Campaign {
  /** Name */
  name: string;
  /** Description */
  description?: string | null;
  /** Start Date */
  start_date: string;
  /** End Date */
  end_date: string;
  /** Status */
  status: string;
  /**
   * Product Ids
   * @default []
   */
  product_ids?: string[];
  /**
   * Discount Ids
   * @default []
   */
  discount_ids?: string[];
  /** Target User Agents */
  target_user_agents?: string[] | null;
  /** Target Authenticated User */
  target_authenticated_user?: boolean | null;
  /** Target User Identity Rules */
  target_user_identity_rules?: UserIdentityRule[] | null;
  /** Target Ip Ranges */
  target_ip_ranges?: string[] | null;
  /** Id */
  id?: string;
}

/** CampaignCreationRequest */
export interface CampaignCreationRequest {
  /** Name */
  name: string;
  /** Description */
  description?: string | null;
  /** Start Date */
  start_date: string;
  /** End Date */
  end_date: string;
  /** Status */
  status: string;
  /**
   * Product Ids
   * @default []
   */
  product_ids?: string[];
  /**
   * Discount Ids
   * @default []
   */
  discount_ids?: string[];
  /** Target User Agents */
  target_user_agents?: string[] | null;
  /** Target Authenticated User */
  target_authenticated_user?: boolean | null;
  /** Target User Identity Rules */
  target_user_identity_rules?: UserIdentityRule[] | null;
  /** Target Ip Ranges */
  target_ip_ranges?: string[] | null;
}

/** Discount */
export interface Discount {
  /** Id */
  id?: string;
  /** Code */
  code: string;
  /** Description */
  description?: string | null;
  /** Discount Percentage */
  discount_percentage: number;
}

/** HTTPValidationError */
export interface HTTPValidationError {
  /** Detail */
  detail?: ValidationError[];
}

/** HealthResponse */
export interface HealthResponse {
  /** Status */
  status: string;
}

/** Product */
export interface Product {
  /** Id */
  id?: string;
  /** Name */
  name: string;
  /** Description */
  description?: string | null;
  /** Price */
  price: number;
}

/** UserIdentityRule */
export interface UserIdentityRule {
  /** Pattern */
  pattern: string;
  /** Allow */
  allow: boolean;
}

/** ValidationError */
export interface ValidationError {
  /** Location */
  loc: (string | number)[];
  /** Message */
  msg: string;
  /** Error Type */
  type: string;
}

export type CheckHealthData = HealthResponse;

/** Response List Products */
export type ListProductsData = {
  products: Product[];
};

export interface GetProductParams {
  /** Product Id */
  productId: string;
}

export type GetProductData = Product;

export type GetProductError = HTTPValidationError;

/** Response List Discounts */
export type ListDiscountsData = {
  discounts: Discount[];
};

export interface GetDiscountParams {
  /** Discount Id */
  discountId: string;
}

export type GetDiscountData = Discount;

export type GetDiscountError = HTTPValidationError;

/** Response List Campaigns */
export type ListCampaignsData = Campaign[];

export type CreateCampaignData = Campaign;

export type CreateCampaignError = HTTPValidationError;

export interface GetCampaignParams {
  /** Campaign Id */
  campaignId: string;
}

export type GetCampaignData = Campaign;

export type GetCampaignError = HTTPValidationError;
