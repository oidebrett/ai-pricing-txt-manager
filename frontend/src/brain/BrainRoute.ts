import {
  CampaignCreationRequest,
  CheckHealthData,
  CreateCampaignData,
  GetCampaignData,
  GetDiscountData,
  GetProductData,
  ListCampaignsData,
  ListDiscountsData,
  ListProductsData,
} from "./data-contracts";

export namespace Brain {
  /**
   * @description Check health of application. Returns 200 when OK, 500 when not.
   * @name check_health
   * @summary Check Health
   * @request GET:/_healthz
   */
  export namespace check_health {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CheckHealthData;
  }

  /**
   * @description Retrieve a list of all available products.
   * @tags Products, dbtn/module:pricing
   * @name list_products
   * @summary List Products
   * @request GET:/routes/api/products
   */
  export namespace list_products {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListProductsData;
  }

  /**
   * @description Retrieve a specific product by its ID.
   * @tags Products, dbtn/module:pricing
   * @name get_product
   * @summary Get Product
   * @request GET:/routes/api/products/{product_id}
   */
  export namespace get_product {
    export type RequestParams = {
      /** Product Id */
      productId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetProductData;
  }

  /**
   * @description Retrieve a list of all available discount codes.
   * @tags Discounts, dbtn/module:pricing
   * @name list_discounts
   * @summary List Discounts
   * @request GET:/routes/api/discounts
   */
  export namespace list_discounts {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListDiscountsData;
  }

  /**
   * @description Retrieve a specific discount code by its ID.
   * @tags Discounts, dbtn/module:pricing
   * @name get_discount
   * @summary Get Discount
   * @request GET:/routes/api/discounts/{discount_id}
   */
  export namespace get_discount {
    export type RequestParams = {
      /** Discount Id */
      discountId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetDiscountData;
  }

  /**
   * @description Retrieve a list of all campaigns.
   * @tags Campaigns, dbtn/module:pricing
   * @name list_campaigns
   * @summary List Campaigns
   * @request GET:/routes/api/campaigns
   */
  export namespace list_campaigns {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListCampaignsData;
  }

  /**
   * @description Create a new dynamic pricing campaign with advanced targeting rules.
   * @tags Campaigns, dbtn/module:pricing
   * @name create_campaign
   * @summary Create Campaign
   * @request POST:/routes/api/campaigns
   */
  export namespace create_campaign {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CampaignCreationRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CreateCampaignData;
  }

  /**
   * @description Retrieve a specific campaign by its ID.
   * @tags Campaigns, dbtn/module:pricing
   * @name get_campaign
   * @summary Get Campaign
   * @request GET:/routes/api/campaigns/{campaign_id}
   */
  export namespace get_campaign {
    export type RequestParams = {
      /** Campaign Id */
      campaignId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetCampaignData;
  }
}
