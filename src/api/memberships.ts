import type { Http } from "../http.ts";
import { type BillingInfo, toBillingInfo } from "../models.ts";
import { kst } from "../normalize.ts";
import type { LiteralUnion } from "../types.ts";
import type { RawMembership, RawMembershipProduct, RawReservedMembership } from "../raw.ts";

export interface MembershipProduct {
  id?: number;
  name?: string;
  type?: LiteralUnion<"basic" | "premium">;
  listPrice?: number;
  period?: string;
  provider?: string;
  autoRenewable?: boolean;
}

export interface Membership {
  product?: MembershipProduct;
  expiresAt: Date | null;
  maxProfiles?: number;
  upgradeType?: string;
  purchaseToken?: string;
}

/** 다음 결제 예정(예약된) 멤버십. current와 모양이 다름. */
export interface ScheduledMembership {
  status?: string;
  nextPaymentAt: Date | null;
  product?: MembershipProduct;
  billingInfo?: BillingInfo | null;
}

const toProduct = (r: RawMembershipProduct): MembershipProduct => ({
  id: r.id,
  name: r.name,
  type: r.membership_type,
  listPrice: r.list_price,
  period: r.period,
  provider: r.provider,
  autoRenewable: r.is_active_renewable,
});

export class Memberships {
  constructor(private http: Http) {}

  async current(): Promise<Membership> {
    const r = await this.http.get<RawMembership>("memberships/v1/current/");
    return {
      product: r.product ? toProduct(r.product) : undefined,
      expiresAt: kst(r.expire_datetime),
      maxProfiles: r.max_profile_count,
      upgradeType: r.upgrade_type,
      purchaseToken: r.purchase_token,
    };
  }

  async scheduled(): Promise<ScheduledMembership> {
    const r = await this.http.get<RawReservedMembership>("memberships/v1/reserved/");
    return {
      status: r.status,
      nextPaymentAt: kst(r.next_payment_date),
      product: r.product ? toProduct(r.product) : undefined,
      billingInfo: r.billing_info ? toBillingInfo(r.billing_info) : null,
    };
  }

  upgradeInfo(productId: number): Promise<{ upgradeAvailable?: boolean; days?: number }> {
    return this.http.get<{ upgrade_available?: boolean; days?: number }>("memberships/v1/upgrade/", {
      query: { product_id: productId },
    }).then((r) => ({ upgradeAvailable: r.upgrade_available, days: r.days }));
  }

  async products(): Promise<MembershipProduct[]> {
    const res = await this.http.get<{ products: RawMembershipProduct[] }>("products/v3/membership_products/", {
      anon: true,
    });
    return res.products.map(toProduct);
  }
}
