import type { Laftel } from "./client.ts";
import { type Membership, toMembership } from "./api/memberships.ts";
import { type BillingInfo, toBillingInfo } from "./models.ts";
import type { RawBillingInfo, RawMembership } from "./raw.ts";
import type { LiteralUnion } from "./types.ts";

type PaymentClient = Pick<Laftel, "api" | "storeHttp">;

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

export interface PaymentOrderItem {
  productId: number;
  promotionId: number | null;
  listPrice: number;
  price: number;
}

export interface PaymentOrder {
  id: number;
  accountId: number;
  items: PaymentOrderItem[];
}

export interface BillingKeyRequest {
  goodsName: string;
  cashAmount: number;
  pointAmount?: number;
  /** 구매 결제 시에만 지정한다. */
  orderId?: number;
  extraData?: Record<string, unknown> & { orderId?: number; order_id?: number };
}

export interface TossCheckout {
  code: number;
  checkoutUri?: string;
  checkoutIosUri?: string;
  checkoutAndroidUri?: string;
  [key: string]: unknown;
}

export interface TossPaymentCheckout {
  checkoutPage: string;
  [key: string]: unknown;
}

export interface NaverpayReservation {
  mode?: string;
  clientId?: string;
  chainId?: string;
  payType?: string;
  productName?: string;
  productCode?: string;
  actionType?: string;
  totalPayAmount?: number;
  returnUrl?: string;
  targetRecurrentId?: string | null;
  merchantUserKey?: string | number;
  merchantPayKey?: string | number;
  productCount?: number;
  taxScopeAmount?: number;
  taxExScopeAmount?: number;
  useCfmYmdt?: string | null;
  merchantExtraParameter?: string | null;
  productItems?: {
    categoryType: string;
    categoryId: string;
    uid: string;
    name: string;
    count: number;
    payReferrer?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  }[];
  [key: string]: unknown;
}

export interface NaverpayAuthorization {
  resultCode: LiteralUnion<"Success" | "UserCancel">;
  paymentId?: string;
  reserveId?: string;
  tempReceiptId?: string;
  resultMessage?: string;
}

export interface ProviderPaymentRequest extends BillingKeyRequest {
  changeType?: string;
}

export interface KakaoPayReadyRequest {
  autoPay: boolean;
  cashAmount: number;
  pointAmount?: number;
  orderId: number | null;
}

export interface NicepayPaymentRequest extends BillingKeyRequest {
  autoPay: boolean;
  paymentOption: LiteralUnion<"card" | "phone">;
}

export type NicepayFormData = Record<string, string | number | boolean | null | Record<string, unknown>>;

export interface NicepayAuthorization {
  AuthResultCode: string;
  AuthResultMsg: string;
  AuthToken: string;
  TxTid: string;
  Signature: string;
  PayMethod: string;
  MID: string;
  Moid: string;
  ReqReserved: string;
  BillAuthYN: string;
  Amt: string;
}

export interface PayPasswordStatus {
  checkAvailable?: boolean;
  failCount?: number;
  failCountLimit?: number;
}

export interface PointProduct {
  id: number;
  name: string;
  listPrice: number;
  pointAmount: number;
  providerProductId: string;
}

export interface OrderSheetLine {
  productCode: string;
  variants: { variantCode: string; quantity: number }[];
}

export interface StoreReceiver {
  name: string;
  cellphone: string;
  zipcode: string;
  address1: string;
  address2?: string;
  shippingMessage?: string;
}

export interface StoreOrderSheet extends Record<string, unknown> {
  receiver: {
    [key: string]: unknown;
    name: string;
    cellphone: string;
    zipcode: string;
    address1: string;
    address2?: string;
    shipping_message?: string;
  };
  products: Array<
    Record<string, unknown> & {
      product_no: number;
      product_code: string;
      product_name: string;
      detail_image: string;
      supplier_name: string;
      supply_price: number;
      price: number;
      has_option: boolean;
      selected_variants: Array<
        Record<string, unknown> & {
          variant_code: string;
          variant_value: string | null;
          options: Array<{ name: string; value: string }> | null;
          additional_amount: number;
          quantity: number;
        }
      >;
      classification: Record<string, unknown> & { id: number; code?: string; name: string };
    }
  >;
  payment_method: Record<string, unknown> & { payment_method: "CARD" };
  payment: Record<string, unknown> & {
    payment_amount: number;
    product_price: number;
    discount_price: number;
    shipping_fee: number;
    shipping_surcharge: number;
  };
}

export interface NicepayReady {
  goodsName: string;
  amount: number;
  merchantId: string;
  ediDate: string;
  merchantOrderId: string;
  signature: string;
  payMethod: "CARD";
  /** Nicepay의 서버측 승인 콜백. */
  returnUrl: string;
  buyerName: string;
  buyerTel: string;
  buyerEmail: string;
  orderSheetId: string;
  charSet: "euc-kr" | "utf-8";
}

export interface NicepayRequestFields {
  Amt: string;
  GoodsName: string;
  EdiDate: string;
  MID: string;
  Moid: string;
  SignData: string;
  PayMethod: string;
  ReturnURL: string;
  BuyerName: string;
  BuyerTel: string;
  BuyerEmail: string;
  CharSet: string;
  ReqReserved: string;
  WapUrl: string;
  IspCancelUrl: string;
  ConnWithIframe: "Y" | "N";
}

interface RawNicepayReady {
  goods_name: string;
  amt: number;
  mid: string;
  edi_date: string;
  moid: string;
  sign_data: string;
  pay_method: "CARD";
  return_url: string;
  buyer_name: string;
  buyer_tel: string;
  buyer_email: string;
  req_reserved: { order_sheet_id: string };
  char_set: "euc-kr" | "utf-8";
}

interface RawNaverpayReservation {
  mode?: string;
  client_id?: string;
  chain_id?: string;
  pay_type?: string;
  product_name?: string;
  product_code?: string;
  action_type?: string;
  total_pay_amount?: number;
  return_url?: string;
  target_recurrent_id?: string | null;
  merchant_user_key?: string | number;
  merchant_pay_key?: string | number;
  product_count?: number;
  tax_scope_amount?: number;
  tax_ex_scope_amount?: number;
  use_cfm_ymdt?: string | null;
  merchant_extra_parameter?: string | null;
  product_items?: {
    category_type: string;
    category_id: string;
    uid: string;
    name: string;
    count: number;
    pay_referrer?: string | null;
    start_date?: string | null;
    end_date?: string | null;
  }[];
  [key: string]: unknown;
}

const toNaverpayReservation = (raw: RawNaverpayReservation): NaverpayReservation => {
  const {
    client_id,
    chain_id,
    pay_type,
    product_name,
    product_code,
    action_type,
    total_pay_amount,
    return_url,
    target_recurrent_id,
    merchant_user_key,
    merchant_pay_key,
    product_count,
    tax_scope_amount,
    tax_ex_scope_amount,
    use_cfm_ymdt,
    merchant_extra_parameter,
    product_items,
    ...rest
  } = raw;
  return {
    ...rest,
    clientId: client_id,
    chainId: chain_id,
    payType: pay_type,
    productName: product_name,
    productCode: product_code,
    actionType: action_type,
    totalPayAmount: total_pay_amount,
    returnUrl: return_url,
    targetRecurrentId: target_recurrent_id,
    merchantUserKey: merchant_user_key,
    merchantPayKey: merchant_pay_key,
    productCount: product_count,
    taxScopeAmount: tax_scope_amount,
    taxExScopeAmount: tax_ex_scope_amount,
    useCfmYmdt: use_cfm_ymdt,
    merchantExtraParameter: merchant_extra_parameter,
    productItems: product_items?.map((p) => ({
      categoryType: p.category_type,
      categoryId: p.category_id,
      uid: p.uid,
      name: p.name,
      count: p.count,
      payReferrer: p.pay_referrer,
      startDate: p.start_date,
      endDate: p.end_date,
    })),
  };
};

export async function listCards(client: PaymentClient): Promise<BillingInfo[]> {
  const response = await client.api.get<RawBillingInfo[]>("billing/v1/info/");
  return response.map(toBillingInfo);
}

export async function registerCard(
  client: PaymentClient,
  card: CardRegistration,
): Promise<{ message?: string; data?: BillingInfo }> {
  const response = await client.api.post<{ msg?: string; data?: RawBillingInfo }>("billing/v1/nicepay/", {
    body: {
      billing_type: card.billingType ?? "card",
      card_number: card.cardNumber,
      expiration_year: card.expirationYear,
      expiration_month: card.expirationMonth,
      birth: card.birth,
      pwd_2digit: card.cardPasswordFirst2Digits,
    },
  });
  return { message: response.msg, data: response.data ? toBillingInfo(response.data) : undefined };
}

export async function deleteBilling(client: PaymentClient): Promise<{ message?: string }> {
  const response = await client.api.post<{ msg?: string }>("billing/v1/reset/");
  return { message: response.msg };
}

export function setBillingPassword(
  client: PaymentClient,
  newPassword: string,
  oldPassword = "",
): Promise<{ status: boolean }> {
  return client.api.post("billing/v1/password/", {
    body: { old_password: oldPassword, new_password: newPassword },
  });
}

export function tossBillingKey(client: PaymentClient, request: BillingKeyRequest): Promise<TossCheckout> {
  return client.api.post("payments/v1/toss/billing_key/", { body: toBillingKeyBody(request) });
}

export async function naverpayBillingKey(
  client: PaymentClient,
  request: ProviderPaymentRequest,
): Promise<NaverpayReservation> {
  const raw = await client.api.post<RawNaverpayReservation>("payments/v1/naverpay/billing_key/", {
    body: toBillingKeyBody(request),
  });
  return toNaverpayReservation(raw);
}

function toBillingKeyBody(request: ProviderPaymentRequest) {
  const { orderId: nestedOrderId, order_id: rawOrderId, ...extraData } = request.extraData ?? {};
  const orderId = request.orderId ?? nestedOrderId ?? rawOrderId;
  return {
    goods_name: request.goodsName,
    payment_amount_cash: request.cashAmount,
    payment_amount_point: request.pointAmount,
    extra_data: { ...extraData, ...(orderId === undefined ? {} : { order_id: orderId }) },
    change_type: request.changeType,
  };
}

export function tossPayment(client: PaymentClient, request: BillingKeyRequest): Promise<TossPaymentCheckout> {
  return client.api.post("payments/v1/toss/", { body: toBillingKeyBody(request) });
}

export async function naverpayPayment(
  client: PaymentClient,
  request: BillingKeyRequest,
): Promise<NaverpayReservation> {
  return toNaverpayReservation(
    await client.api.post<RawNaverpayReservation>("payments/v1/naverpay/", {
      body: toBillingKeyBody(request),
    }),
  );
}

export async function naverpayBilling(
  client: PaymentClient,
  request: BillingKeyRequest,
): Promise<NaverpayReservation> {
  return toNaverpayReservation(
    await client.api.post<RawNaverpayReservation>("payments/v1/naverpay/billing/", {
      body: toBillingKeyBody(request),
    }),
  );
}

export function completeNaverpayAuthorization(
  client: PaymentClient,
  reservation: NaverpayReservation,
  authorization: NaverpayAuthorization,
): Promise<void> {
  if (authorization.resultCode !== "Success") {
    throw new Error(`NaverPay authorization did not succeed: ${authorization.resultCode}`);
  }
  if (!reservation.returnUrl) throw new Error("NaverPay reservation has no returnUrl");
  return client.api.get(reservation.returnUrl, {
    query: {
      resultCode: authorization.resultCode,
      paymentId: authorization.paymentId,
      reserveId: authorization.reserveId,
      tempReceiptId: authorization.tempReceiptId,
      resultMessage: authorization.resultMessage,
    },
  });
}

export async function payPasswordStatus(client: PaymentClient): Promise<PayPasswordStatus> {
  const response = await client.api.get<{
    is_check_available?: boolean;
    fail_count?: number;
    fail_count_limit?: number;
  }>("payments/v2/pay_password/check/");
  return {
    checkAvailable: response.is_check_available,
    failCount: response.fail_count,
    failCountLimit: response.fail_count_limit,
  };
}

export function checkPayPassword(client: PaymentClient, password: string): Promise<void> {
  return client.api.post("payments/v2/pay_password/check/", { body: { pay_password: password } });
}

export function resetPayPassword(client: PaymentClient): Promise<void> {
  return client.api.del("billing/v1/password/");
}

export function updateSubscriptionBillingInfo(
  client: PaymentClient,
  input: { billingInfoId: number; payPassword: string },
): Promise<void> {
  return client.api.post("subscriptions/v1/billing_info/", {
    body: { billing_info_id: input.billingInfoId, pay_password: input.payPassword },
  });
}

export function payOrderWithPoints(client: PaymentClient, orderId: number): Promise<void> {
  return client.api.post("payments/v2/point/", { body: { order_id: orderId } });
}

export async function iamportPaymentStatus(client: PaymentClient, key: string): Promise<boolean> {
  const response = await client.api.post<{ status?: boolean }>("payments/v2/iamport_check/", { body: { key } });
  return response.status === true;
}

export async function kakaoPayReady(
  client: PaymentClient,
  request: KakaoPayReadyRequest,
): Promise<{ checkoutUri: string }> {
  const response = await client.api.post<{ next_redirect_pc_url: string }>("payments/v2/kakaopay/ready/", {
    body: {
      auto_pay: request.autoPay,
      payment_amount_cash: request.cashAmount,
      payment_amount_point: request.pointAmount ?? 0,
      extra_data: { order_id: request.orderId },
    },
  });
  return { checkoutUri: response.next_redirect_pc_url };
}

export function nicepayPayment(
  client: PaymentClient,
  request: NicepayPaymentRequest,
): Promise<NicepayFormData> {
  const body = toBillingKeyBody(request);
  if (request.autoPay) {
    return client.api.post("payments/v2/nicepay/mobile/billing_key/", { body });
  }
  const version = body.extra_data.order_id !== undefined ? "v2" : "v1";
  return client.api.post(`payments/${version}/nicepay/`, {
    query: { type: request.paymentOption },
    body,
  });
}

export async function completeNicepayAuthorization(
  client: PaymentClient,
  authorization: NicepayAuthorization,
  options: { billingKey?: boolean } = {},
): Promise<boolean> {
  const path = options.billingKey
    ? "payments/v2/nicepay/mobile/billing_key/callback/"
    : "payments/v2/nicepay/callback/";
  const response = await client.api.post<{ is_success?: boolean }>(path, {
    query: { response_type: "json" },
    body: authorization,
  });
  return response.is_success === true;
}

export function deleteCard(client: PaymentClient, billingInfoId: number): Promise<void> {
  return client.api.del(`billing/v1/nicepay/${billingInfoId}/`);
}

/** 여러 에피소드를 대여·소장할 때 itemId가 필요하다. */
export async function createOrder(
  client: PaymentClient,
  input: { productIds: number[]; itemId?: number },
): Promise<PaymentOrder> {
  const response = await client.api.post<{
    id: number;
    account: number;
    order_items?: Array<{
      product_id: number;
      promotion_id: number | null;
      list_price: number;
      price: number;
    }>;
  }>("orders/v1/list/", {
    body: { product_ids: input.productIds, item_id: input.itemId },
  });
  return {
    id: response.id,
    accountId: response.account,
    items: (response.order_items ?? []).map((item) => ({
      productId: item.product_id,
      promotionId: item.promotion_id,
      listPrice: item.list_price,
      price: item.price,
    })),
  };
}

export function charge(client: PaymentClient, input: Charge): Promise<void> {
  return client.api.post("payments/v2/billing/", {
    body: {
      billing_info_id: input.billingInfoId,
      order_id: input.orderId,
      pay_password: input.payPassword,
      auto_pay: input.autoPay ?? false,
      payment_amount_cash: input.cashAmount,
      payment_amount_point: input.pointAmount ?? 0,
    },
  });
}

export async function pointProducts(client: PaymentClient): Promise<PointProduct[]> {
  const response = await client.api.get<{
    products?: Array<{
      id: number;
      name: string;
      list_price: number;
      point_amount: number;
      provider_product_id: string;
    }>;
  }>("products/v2/point_products/");
  return (response.products ?? []).map((product) => ({
    id: product.id,
    name: product.name,
    listPrice: product.list_price,
    pointAmount: product.point_amount,
    providerProductId: product.provider_product_id,
  }));
}

export function subscribeMembership(
  client: PaymentClient,
  input: { productId: number; billingInfoId: number },
): Promise<void> {
  return client.api.post("memberships/v1/reserved/", {
    body: { product_id: input.productId, billing_info_id: input.billingInfoId },
  });
}

export async function changeMembership(client: PaymentClient, productId: number): Promise<Membership> {
  return toMembership(
    await client.api.post<RawMembership>("memberships/v1/upgrade/", { body: { product_id: productId } }),
  );
}

export function cancelMembership(client: PaymentClient): Promise<void> {
  return client.api.del("memberships/v1/reserved/");
}

export function retryMembershipBilling(client: PaymentClient): Promise<void> {
  return client.api.post("payments/v2/retry_billing/");
}

export async function createOrderSheet(
  client: PaymentClient,
  lines: OrderSheetLine[],
  options: { cartItemIds?: number[] } = {},
): Promise<{ orderSheetId: string }> {
  const response = await client.storeHttp.post<{ order_sheet_id: string }>("v1.0/order_sheets/", {
    body: {
      products: lines.map((line) => ({
        product_code: line.productCode,
        selected_variants: line.variants.map((variant) => ({
          variant_code: variant.variantCode,
          quantity: variant.quantity,
        })),
      })),
      cart_item_ids: options.cartItemIds,
    },
  });
  return { orderSheetId: response.order_sheet_id };
}

const toRawReceiver = (receiver: StoreReceiver): StoreOrderSheet["receiver"] => ({
  name: receiver.name,
  cellphone: receiver.cellphone,
  zipcode: receiver.zipcode,
  address1: receiver.address1,
  address2: receiver.address2,
  shipping_message: receiver.shippingMessage,
});

export function updateOrderSheet(
  client: PaymentClient,
  uid: string,
  receiver: StoreReceiver,
): Promise<StoreOrderSheet> {
  return client.storeHttp.patch<StoreOrderSheet>(`v1.0/order_sheets/${uid}/`, {
    body: { receiver: toRawReceiver(receiver) },
  });
}

export async function readyOrderPayment(
  client: PaymentClient,
  uid: string,
  input: { pgType?: LiteralUnion<"nicepay">; orderSheet: StoreOrderSheet },
): Promise<NicepayReady> {
  const response = await client.storeHttp.post<RawNicepayReady>(`v1.0/order_sheets/${uid}/payment/ready/`, {
    body: { pg_type: input.pgType ?? "nicepay", order_sheet: input.orderSheet },
  });
  return {
    goodsName: response.goods_name,
    amount: response.amt,
    merchantId: response.mid,
    ediDate: response.edi_date,
    merchantOrderId: response.moid,
    signature: response.sign_data,
    payMethod: response.pay_method,
    returnUrl: response.return_url,
    buyerName: response.buyer_name,
    buyerTel: response.buyer_tel,
    buyerEmail: response.buyer_email,
    orderSheetId: response.req_reserved.order_sheet_id,
    charSet: response.char_set,
  };
}

export function toNicepayRequestFields(
  ready: NicepayReady,
  options: { returnUrl?: string; appUrl?: string; iframe?: boolean } = {},
): NicepayRequestFields {
  const appUrl = options.appUrl ?? "laftel://";
  return {
    Amt: String(ready.amount),
    GoodsName: ready.goodsName,
    EdiDate: ready.ediDate,
    MID: ready.merchantId,
    Moid: ready.merchantOrderId,
    SignData: ready.signature,
    PayMethod: ready.payMethod,
    ReturnURL: options.returnUrl ?? ready.returnUrl,
    BuyerName: ready.buyerName,
    BuyerTel: ready.buyerTel,
    BuyerEmail: ready.buyerEmail,
    CharSet: ready.charSet,
    ReqReserved: encodeURIComponent(JSON.stringify({ order_sheet_id: ready.orderSheetId })),
    WapUrl: appUrl,
    IspCancelUrl: appUrl,
    ConnWithIframe: options.iframe === false ? "N" : "Y",
  };
}
