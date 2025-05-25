import {
  CampaignCreationRequest,
  CheckHealthData,
  CreateCampaignData,
  CreateCampaignError,
  GetCampaignData,
  GetCampaignError,
  GetCampaignParams,
  GetDiscountData,
  GetDiscountError,
  GetDiscountParams,
  GetProductData,
  GetProductError,
  GetProductParams,
  ListCampaignsData,
  ListDiscountsData,
  ListProductsData,
} from "./data-contracts";
import { ContentType, HttpClient, RequestParams } from "./http-client";

export class Brain<SecurityDataType = unknown> extends HttpClient<SecurityDataType> {
  /**
   * @description Check health of application. Returns 200 when OK, 500 when not.
   *
   * @name check_health
   * @summary Check Health
   * @request GET:/_healthz
   */
  check_health = (params: RequestParams = {}) =>
    this.request<CheckHealthData, any>({
      path: `/_healthz`,
      method: "GET",
      ...params,
    });

  /**
   * @description Retrieve a list of all available products.
   *
   * @tags Products, dbtn/module:pricing
   * @name list_products
   * @summary List Products
   * @request GET:/routes/api/products
   */
  list_products = (params: RequestParams = {}) =>
    this.request<ListProductsData, any>({
      path: `/routes/api/products`,
      method: "GET",
      ...params,
    });

  /**
   * @description Retrieve a specific product by its ID.
   *
   * @tags Products, dbtn/module:pricing
   * @name get_product
   * @summary Get Product
   * @request GET:/routes/api/products/{product_id}
   */
  get_product = ({ productId, ...query }: GetProductParams, params: RequestParams = {}) =>
    this.request<GetProductData, GetProductError>({
      path: `/routes/api/products/${productId}`,
      method: "GET",
      ...params,
    });

  /**
   * @description Retrieve a list of all available discount codes.
   *
   * @tags Discounts, dbtn/module:pricing
   * @name list_discounts
   * @summary List Discounts
   * @request GET:/routes/api/discounts
   */
  list_discounts = (params: RequestParams = {}) =>
    this.request<ListDiscountsData, any>({
      path: `/routes/api/discounts`,
      method: "GET",
      ...params,
    });

  /**
   * @description Retrieve a specific discount code by its ID.
   *
   * @tags Discounts, dbtn/module:pricing
   * @name get_discount
   * @summary Get Discount
   * @request GET:/routes/api/discounts/{discount_id}
   */
  get_discount = ({ discountId, ...query }: GetDiscountParams, params: RequestParams = {}) =>
    this.request<GetDiscountData, GetDiscountError>({
      path: `/routes/api/discounts/${discountId}`,
      method: "GET",
      ...params,
    });

  /**
   * @description Retrieve a list of all campaigns.
   *
   * @tags Campaigns, dbtn/module:pricing
   * @name list_campaigns
   * @summary List Campaigns
   * @request GET:/routes/api/campaigns
   */
  list_campaigns = (params: RequestParams = {}) =>
    this.request<ListCampaignsData, any>({
      path: `/routes/api/campaigns`,
      method: "GET",
      ...params,
    });

  /**
   * @description Create a new dynamic pricing campaign with advanced targeting rules.
   *
   * @tags Campaigns, dbtn/module:pricing
   * @name create_campaign
   * @summary Create Campaign
   * @request POST:/routes/api/campaigns
   */
  create_campaign = (data: CampaignCreationRequest, params: RequestParams = {}) =>
    this.request<CreateCampaignData, CreateCampaignError>({
      path: `/routes/api/campaigns`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Retrieve a specific campaign by its ID.
   *
   * @tags Campaigns, dbtn/module:pricing
   * @name get_campaign
   * @summary Get Campaign
   * @request GET:/routes/api/campaigns/{campaign_id}
   */
  get_campaign = ({ campaignId, ...query }: GetCampaignParams, params: RequestParams = {}) =>
    this.request<GetCampaignData, GetCampaignError>({
      path: `/routes/api/campaigns/${campaignId}`,
      method: "GET",
      ...params,
    });
}
