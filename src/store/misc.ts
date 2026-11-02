import type { ApiOptions, Http } from "../http.ts";
import { mapPage } from "../paginate.ts";
import type { Paginated } from "../types.ts";
import type { RawHomeCollection, RawStoreClassification, RawStoreProduct } from "../raw.ts";
import { StoreProduct } from "./products.ts";

export interface Classification {
  readonly raw: RawStoreClassification;
  id: number;
  name: string;
  logoUrl?: string;
  thumbnailUrl?: string;
}

export interface HomeCollection {
  readonly raw: RawHomeCollection;
  id: number;
  name: string;
  type: string;
  layoutType: string;
  moreLinkUrl: string | null;
  image: { title: string; description: string; imageUrl: string; linkUrl: string } | null;
}

export interface RawStoreCollectionPage extends Paginated<RawStoreProduct> {
  home_collection_id: number;
  name: string;
  collection_type: string;
  classification_id: number | null;
}

export interface StoreCollectionPage extends Paginated<StoreProduct> {
  readonly raw: RawStoreCollectionPage;
  id: number;
  name: string;
  type: string;
  classificationId: number | null;
}

export type StoreCartUnavailableReason = "OUT_OF_STOCK" | "SALES_ENDED" | "REPURCHASE_RESTRICTED";
export type StoreShippingFeeType = "T" | "R" | "M";

export interface StoreCartVariant {
  cartItemId: number;
  variantCode: string;
  variantValue: string;
  quantity: number;
  maximumQuantity: number | null;
  additionalAmount: number;
  stock: number | null;
  orderable: boolean;
  reason: StoreCartUnavailableReason | null;
}

export interface StoreCartProduct {
  productNo: number;
  productCode: string;
  name: string;
  supplyPrice: number;
  price: number;
  thumbnailUrl: string;
  classification: { id: number; name: string; code?: string };
  repurchaseRestricted: boolean;
  productType?: string;
  maximumQuantity?: number | null;
  orderQuantityLimitType?: string;
  variants: StoreCartVariant[];
  lineTotal: number;
}

export interface StoreCartShippingGroup {
  products: StoreCartProduct[];
  shippingInfo: { shippingFee: number; shippingFeeType: StoreShippingFeeType; freeShippingPrice: number };
}

export interface StoreCartSupplierGroup {
  supplierName: string;
  shippingGroups: StoreCartShippingGroup[];
}

export interface StoreCart {
  readonly raw: RawStoreCart;
  availableItems: StoreCartSupplierGroup[];
  unavailableItems: StoreCartSupplierGroup[];
}

export interface RawStoreCart {
  available_items?: RawStoreCartSupplierGroup[];
  unavailable_items?: RawStoreCartSupplierGroup[];
  [key: string]: unknown;
}

export interface RawStoreCartSupplierGroup {
  supplier_name: string;
  shipping_groups: Array<{
    products: Array<{
      product_no: number;
      product_code: string;
      name: string;
      supply_price: number;
      price: number;
      thumbnail_url: string;
      classification: { id: number; name: string; code?: string };
      is_repurchase_restricted: boolean;
      product_type?: string;
      maximum_quantity?: number | null;
      order_quantity_limit_type?: string;
      variants: Array<{
        cart_item_id: number;
        variant_code: string;
        variant_value: string;
        quantity: number;
        maximum_quantity: number | null;
        additional_amount: number;
        stock: number | null;
        is_orderable: boolean;
        reason: StoreCartUnavailableReason | null;
      }>;
      line_total: number;
      [key: string]: unknown;
    }>;
    shipping_info: {
      shipping_fee: number;
      shipping_fee_type: StoreShippingFeeType;
      free_shipping_price: number;
    };
  }>;
}

function toStoreCart(response: RawStoreCart): StoreCart {
  const groups = (rows: RawStoreCartSupplierGroup[] = []): StoreCartSupplierGroup[] =>
    rows.map((supplier) => ({
      supplierName: supplier.supplier_name,
      shippingGroups: supplier.shipping_groups.map((group) => ({
        products: group.products.map((product) => ({
          productNo: product.product_no,
          productCode: product.product_code,
          name: product.name,
          supplyPrice: product.supply_price,
          price: product.price,
          thumbnailUrl: product.thumbnail_url,
          classification: product.classification,
          repurchaseRestricted: product.is_repurchase_restricted,
          productType: product.product_type,
          maximumQuantity: product.maximum_quantity,
          orderQuantityLimitType: product.order_quantity_limit_type,
          variants: product.variants.map((variant) => ({
            cartItemId: variant.cart_item_id,
            variantCode: variant.variant_code,
            variantValue: variant.variant_value,
            quantity: variant.quantity,
            maximumQuantity: variant.maximum_quantity,
            additionalAmount: variant.additional_amount,
            stock: variant.stock,
            orderable: variant.is_orderable,
            reason: variant.reason,
          })),
          lineTotal: product.line_total,
        })),
        shippingInfo: {
          shippingFee: group.shipping_info.shipping_fee,
          shippingFeeType: group.shipping_info.shipping_fee_type,
          freeShippingPrice: group.shipping_info.free_shipping_price,
        },
      })),
    }));
  return {
    raw: response,
    availableItems: groups(response.available_items),
    unavailableItems: groups(response.unavailable_items),
  };
}

const toClassification = (r: RawStoreClassification): Classification => ({
  raw: r,
  id: r.id,
  name: r.name,
  logoUrl: r.logo_image_url,
  thumbnailUrl: r.thumbnail_url,
});

export class StoreHome {
  constructor(private http: Http) {}

  async collections(opts: ApiOptions = {}): Promise<HomeCollection[]> {
    const list = await this.http.get<RawHomeCollection[]>("v1.0/home/collections/", {
      ...opts,
      anon: opts.anon ?? this.http.anon ?? true,
    });
    return list.map((r) => ({
      raw: r,
      id: r.home_collection_id,
      name: r.name,
      type: r.collection_type,
      layoutType: r.layout_type,
      moreLinkUrl: r.more_link_url,
      image: r.image
        ? {
          title: r.image.title,
          description: r.image.description,
          imageUrl: r.image.image_url,
          linkUrl: r.image.image_link_url,
        }
        : null,
    }));
  }

  async collection(
    id: number,
    opts: ApiOptions & { limit?: number; offset?: number } = {},
  ): Promise<StoreCollectionPage> {
    const page = await this.http.get<RawStoreCollectionPage>(`v1.0/home/collections/${id}/`, {
      query: { limit: opts.limit, offset: opts.offset },
      anon: opts.anon ?? this.http.anon ?? true,
      signal: opts.signal,
    });
    return {
      ...mapPage(page, (r) => new StoreProduct(r)),
      raw: page,
      id: page.home_collection_id,
      name: page.name,
      type: page.collection_type,
      classificationId: page.classification_id,
    };
  }
}

export class StoreCarts {
  constructor(private http: Http) {}

  async count(): Promise<number> {
    const res = await this.http.get<{ product_count?: number }>("v1.0/carts/count/");
    return res.product_count ?? 0;
  }

  async list(): Promise<StoreCart> {
    return toStoreCart(await this.http.get<RawStoreCart>("v1.0/carts/"));
  }

  async add(
    input: { productCode: string; selectedVariants: { variantCode: string; quantity: number }[] },
  ): Promise<{ productCount: number }> {
    const response = await this.http.post<{ product_count: number }>("v1.0/carts/", {
      body: {
        product_code: input.productCode,
        selected_variants: input.selectedVariants.map((variant) => ({
          variant_code: variant.variantCode,
          quantity: variant.quantity,
        })),
      },
    });
    return { productCount: response.product_count };
  }

  async remove(cartItemIds: number[]): Promise<{ productCount: number }> {
    const response = await this.http.post<{ product_count: number }>("v1.0/carts/items/remove/", {
      body: { cart_item_ids: cartItemIds },
    });
    return { productCount: response.product_count };
  }

  async removeUnavailable(): Promise<{ productCount: number }> {
    const response = await this.http.del<{ product_count: number }>("v1.0/carts/items/unavailable/");
    return { productCount: response.product_count };
  }

  updateQuantity(cartItemId: number, quantity: number, forceAdjustQuantity = false): Promise<unknown> {
    return this.http.patch(`v1.0/carts/items/${cartItemId}/`, {
      body: { quantity, force_adjust_quantity: forceAdjustQuantity },
    });
  }
}

export interface RawStoreWishlistIds {
  product_nos?: number[];
  classification_ids?: number[];
  ip_ids?: number[];
  [key: string]: unknown;
}

export interface StoreWishlistIds {
  readonly raw: RawStoreWishlistIds;
  productNos?: number[];
  classificationIds?: number[];
  ipIds?: number[];
}

export class StoreWishlists {
  constructor(private http: Http) {}

  async list(opts: ApiOptions & { limit?: number } = {}): Promise<Paginated<StoreProduct>> {
    const page = await this.http.get<Paginated<RawStoreProduct>>("v1.0/wishlists/products/", {
      anon: opts.anon,
      signal: opts.signal,
      query: { limit: opts.limit },
    });
    return mapPage(page, (r) => new StoreProduct(r));
  }

  async ids(opts: ApiOptions = {}): Promise<StoreWishlistIds> {
    const r = await this.http.get<RawStoreWishlistIds>(
      "v1.0/wishlists/ids/",
      opts,
    );
    return { raw: r, productNos: r.product_nos, classificationIds: r.classification_ids, ipIds: r.ip_ids };
  }

  classifications(opts: ApiOptions & { limit?: number } = {}): Promise<unknown> {
    return this.http.get("v1.0/wishlists/classifications/", {
      anon: opts.anon,
      signal: opts.signal,
      query: { limit: opts.limit },
    });
  }

  add(productNo: number): Promise<unknown> {
    return this.http.post("v1.0/wishlists/products/", { body: { product_no: productNo } });
  }

  remove(productNo: number): Promise<void> {
    return this.http.del(`v1.0/wishlists/products/${productNo}/`);
  }
}

export class StoreOrders {
  constructor(private http: Http) {}

  list(opts: ApiOptions & { limit?: number } = {}): Promise<Paginated<unknown>> {
    return this.http.get("v1.0/orders/", { anon: opts.anon, signal: opts.signal, query: { limit: opts.limit } });
  }
}

export class StoreClassifications {
  constructor(private http: Http) {}

  async popular(opts: ApiOptions = {}): Promise<Paginated<Classification>> {
    const page = await this.http.get<Paginated<RawStoreClassification>>("v1.0/classifications/popular/", {
      anon: opts.anon ?? this.http.anon ?? true,
      signal: opts.signal,
    });
    return mapPage(page, toClassification);
  }

  async search(keyword: string, opts: ApiOptions & { limit?: number } = {}): Promise<Paginated<Classification>> {
    const page = await this.http.get<Paginated<RawStoreClassification>>("v1.0/classifications/search/", {
      query: { keyword, limit: opts.limit },
      anon: opts.anon ?? this.http.anon ?? true,
      signal: opts.signal,
    });
    return mapPage(page, toClassification);
  }
}

export class StoreBoards {
  constructor(private http: Http) {}

  inquiry(opts: ApiOptions & { limit?: number; offset?: number } = {}): Promise<Paginated<unknown>> {
    return this.http.get("v1.0/boards/inquiry/", {
      anon: opts.anon,
      signal: opts.signal,
      query: { limit: opts.limit, offset: opts.offset },
    });
  }

  deleteInquiry(articleNo: number): Promise<void> {
    return this.http.del(`v1.0/boards/inquiry/${articleNo}/`);
  }

  markInquiryReplyRead(articleNo: number): Promise<void> {
    return this.http.post(`v1.0/boards/inquiry/${articleNo}/read_reply/`);
  }
}

export class StoreAccount {
  constructor(private http: Http) {}

  status(opts: ApiOptions = {}): Promise<unknown> {
    return this.http.get("v1.0/status/", { ...opts, anon: opts.anon ?? this.http.anon ?? true });
  }

  checkPermission(): Promise<unknown> {
    return this.http.get("v1.0/users/check_permission/");
  }

  /** 403 means the current profile cannot use Store; 404 means no linked Store account. */
  checkExternalAccount(): Promise<void> {
    return this.http.post("v1.0/users/check_external_account/");
  }
}
