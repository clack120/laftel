import type { Laftel } from "./client.ts";
import { type BillingInfo, toBillingInfo } from "./models.ts";
import type { RawBillingInfo } from "./raw.ts";
import type { LiteralUnion } from "./types.ts";

export interface CardRegistration {
  cardNumber: string;
  expirationYear: string;
  expirationMonth: string;
  birth: string;
  /** 카드 비밀번호 앞 2자리 */
  cardPasswordFirst2Digits: string;
  billingType?: string;
}

export interface Charge {
  billingInfoId: number;
  orderId: number;
  payPassword: string;
  cashAmount: number;
  pointAmount?: number;
  autoPay?: boolean;
}

export interface BillingKeyRequest {
  goodsName: string;
  cashAmount: number;
  pointAmount?: number;
  extraData?: Record<string, unknown>;
}

export interface TossCheckout {
  code: number;
  /** 웹 결제 페이지 */
  checkoutUri?: string;
  /** iOS 딥링크 */
  checkoutIosUri?: string;
  /** Android 딥링크(intent://) */
  checkoutAndroidUri?: string;
  [k: string]: unknown;
}

/** 네이버페이 JS SDK 초기화 파라미터. 브라우저 SDK에 그대로 넘겨 결제창을 띄워야 함 */
export interface NaverpayReservation {
  mode?: string;
  client_id?: string;
  chain_id?: string;
  pay_type?: string;
  product_name?: string;
  product_code?: string;
  action_type?: string;
  total_pay_amount?: number;
  /** 완료 후 콜백 URL(billing key 등록) */
  return_url?: string;
  target_recurrent_id?: string | null;
  [k: string]: unknown;
}

export async function listCards(client: Laftel): Promise<BillingInfo[]> {
  const r = await client.api.get<RawBillingInfo[]>("billing/v1/info/");
  return r.map(toBillingInfo);
}

export async function registerCard(
  client: Laftel,
  card: CardRegistration,
): Promise<{ message?: string; data?: BillingInfo }> {
  const r = await client.api.post<{ msg?: string; data?: RawBillingInfo }>("billing/v1/nicepay/", {
    body: {
      billing_type: card.billingType ?? "card",
      card_number: card.cardNumber,
      expiration_year: card.expirationYear,
      expiration_month: card.expirationMonth,
      birth: card.birth,
      pwd_2digit: card.cardPasswordFirst2Digits,
    },
  });
  return { message: r.msg, data: r.data ? toBillingInfo(r.data) : undefined };
}

export async function deleteBilling(client: Laftel): Promise<{ message?: string }> {
  const r = await client.api.post<{ msg?: string }>("billing/v1/reset/", { body: {} });
  return { message: r.msg };
}

export function setBillingPassword(
  client: Laftel,
  newPassword: string,
  oldPassword = "",
): Promise<{ status: boolean }> {
  return client.api.post("billing/v1/password/", { body: { old_password: oldPassword, new_password: newPassword } });
}

// 토스 정기결제 수단(billing key) 등록용 체크아웃 URI 반환. 사용자가 토스에서 완료하면 콜백으로 등록됨. 콘텐츠 즉시결제 아님.
export function tossBillingKey(client: Laftel, req: BillingKeyRequest): Promise<TossCheckout> {
  return client.api.post("payments/v1/toss/billing_key/", { body: toBillingKeyBody(req) });
}

// 네이버페이 SDK 예약 파라미터 반환(URI 아님). 브라우저에서 네이버페이 JS SDK로 결제창 띄우고 return_url 콜백으로 billing key 등록.
export function naverpayBillingKey(client: Laftel, req: BillingKeyRequest): Promise<NaverpayReservation> {
  return client.api.post("payments/v1/naverpay/billing_key/", { body: toBillingKeyBody(req) });
}

function toBillingKeyBody(req: BillingKeyRequest) {
  return {
    goods_name: req.goodsName,
    payment_amount_cash: req.cashAmount,
    payment_amount_point: req.pointAmount,
    extra_data: req.extraData,
  };
}

export async function payPasswordStatus(
  client: Laftel,
): Promise<{ checkAvailable?: boolean; failCount?: number; failCountLimit?: number }> {
  const r = await client.api.get<{ is_check_available?: boolean; fail_count?: number; fail_count_limit?: number }>(
    "payments/v2/pay_password/check/",
  );
  return { checkAvailable: r.is_check_available, failCount: r.fail_count, failCountLimit: r.fail_count_limit };
}

export function checkPayPassword(client: Laftel, password: string): Promise<void> {
  return client.api.post("payments/v2/pay_password/check/", { body: { pay_password: password } });
}

export function charge(client: Laftel, input: Charge): Promise<void> {
  return client.api.post("payments/v2/billing/", {
    body: {
      billing_info_id: input.billingInfoId,
      order_id: input.orderId,
      pay_password: input.payPassword,
      payment_amount_cash: input.cashAmount,
      payment_amount_point: input.pointAmount,
      auto_pay: input.autoPay,
    },
  });
}

/*
export function retryBilling(client: Laftel, payload: Record<string, unknown> = {}): Promise<unknown> {
  return client.api.post("payments/v2/retry_billing/", { body: payload });
}
*/

/** 멤버십 정기결제 예약(구독 시작). billingInfoId는 listCards()로 조회. */
export function subscribeMembership(
  client: Laftel,
  input: { productId: number; billingInfoId: number },
): Promise<unknown> {
  return client.api.post("memberships/v1/reserved/", {
    body: { product_id: input.productId, billing_info_id: input.billingInfoId },
  });
}

/** 멤버십 등급 변경(업그레이드). */
export function changeMembership(client: Laftel, productId: number): Promise<unknown> {
  return client.api.post("memberships/v1/upgrade/", { body: { product_id: productId } });
}

export function cancelMembership(client: Laftel): Promise<void> {
  return client.api.del("memberships/v1/reserved/");
}

export interface OrderSheetLine {
  productCode: string;
  variants: { variantCode: string; quantity: number }[];
}

/** 스토어 주문서 생성(결제 초기화 1단계). 반환된 order_sheet_id로 update/ready 진행. */
export function createOrderSheet(
  client: Laftel,
  lines: OrderSheetLine[],
): Promise<{ order_sheet_id?: string; [k: string]: unknown }> {
  return client.storeHttp.post("v1.0/order_sheets/", {
    body: {
      products: lines.map((l) => ({
        product_code: l.productCode,
        selected_variants: l.variants.map((v) => ({ variant_code: v.variantCode, quantity: v.quantity })),
      })),
    },
  });
}

/** 주문서에 수령자 정보 설정(결제 초기화 2단계). receiver 내부 필드는 스키마 미확정이라 열어둠. */
export function updateOrderSheet(client: Laftel, uid: string, receiver: Record<string, unknown>): Promise<unknown> {
  return client.storeHttp.patch(`v1.0/order_sheets/${uid}/`, { body: { receiver } });
}

/** 결제 준비(결제 초기화 3단계). pgType 기본 nicepay. orderSheet 내부는 스키마 미확정이라 열어둠. */
export function readyOrderPayment(
  client: Laftel,
  uid: string,
  input: { pgType?: LiteralUnion<"nicepay">; orderSheet: Record<string, unknown> },
): Promise<unknown> {
  return client.storeHttp.post(`v1.0/order_sheets/${uid}/payment/ready/`, {
    body: { pgType: input.pgType ?? "nicepay", orderSheet: input.orderSheet },
  });
}
