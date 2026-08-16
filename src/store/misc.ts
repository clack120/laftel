import type { Http } from "../http.ts";
import { mapPage } from "../paginate.ts";
import type { Paginated } from "../types.ts";
import type { RawHomeCollection, RawStoreClassification, RawStoreProduct } from "../raw.ts";
import { StoreProduct } from "./products.ts";

export interface Classification {
  id: number;
  name: string;
  logoUrl: string;
}

export interface HomeCollection {
  id: number;
  name: string;
  type: string;
  layoutType: string;
  moreLinkUrl: string;
  image: { title: string; description: string; imageUrl: string; linkUrl: string } | null;
}

const toClassification = (r: RawStoreClassification): Classification => ({
  id: r.id,
  name: r.name,
  logoUrl: r.logo_image_url,
});

export class StoreHome {
  constructor(private http: Http) {}

  async collections(): Promise<HomeCollection[]> {
    const list = await this.http.get<RawHomeCollection[]>("v1.0/home/collections/", { anon: true });
    return list.map((r) => ({
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

  async collection(id: number, opts: { limit?: number } = {}): Promise<Paginated<StoreProduct>> {
    const page = await this.http.get<Paginated<RawStoreProduct>>(`v1.0/home/collections/${id}/`, {
      query: { ...opts },
      anon: true,
    });
    return mapPage(page, (r) => new StoreProduct(r));
  }
}

export class StoreCarts {
  constructor(private http: Http) {}

  async count(): Promise<number> {
    const res = await this.http.get<{ product_count?: number }>("v1.0/carts/count/");
    return res.product_count ?? 0;
  }
}

export class StoreWishlists {
  constructor(private http: Http) {}

  async list(opts: { limit?: number } = {}): Promise<Paginated<StoreProduct>> {
    const page = await this.http.get<Paginated<RawStoreProduct>>("v1.0/wishlists/products/", { query: { ...opts } });
    return mapPage(page, (r) => new StoreProduct(r));
  }

  async ids(): Promise<{ productNos: number[]; classificationIds: number[] }> {
    const r = await this.http.get<{ product_nos?: number[]; classification_ids?: number[] }>("v1.0/wishlists/ids/");
    return { productNos: r.product_nos ?? [], classificationIds: r.classification_ids ?? [] };
  }

  classifications(opts: { limit?: number } = {}): Promise<unknown> {
    return this.http.get("v1.0/wishlists/classifications/", { query: { ...opts } });
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

  list(opts: { limit?: number } = {}): Promise<Paginated<unknown>> {
    return this.http.get("v1.0/orders/", { query: { ...opts } });
  }
}

export class StoreClassifications {
  constructor(private http: Http) {}

  async popular(): Promise<Paginated<Classification>> {
    const page = await this.http.get<Paginated<RawStoreClassification>>("v1.0/classifications/popular/", {
      anon: true,
    });
    return mapPage(page, toClassification);
  }

  async search(keyword: string, opts: { limit?: number } = {}): Promise<Paginated<Classification>> {
    const page = await this.http.get<Paginated<RawStoreClassification>>("v1.0/classifications/search/", {
      query: { keyword, ...opts },
      anon: true,
    });
    return mapPage(page, toClassification);
  }
}

export class StoreBoards {
  constructor(private http: Http) {}

  inquiry(opts: { limit?: number; offset?: number } = {}): Promise<Paginated<unknown>> {
    return this.http.get("v1.0/boards/inquiry/", { query: { ...opts } });
  }
}

export class StoreAccount {
  constructor(private http: Http) {}

  status(): Promise<unknown> {
    return this.http.get("v1.0/status/", { anon: true });
  }

  checkPermission(): Promise<unknown> {
    return this.http.get("v1.0/users/check_permission/");
  }
}
