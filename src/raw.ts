import type { LiteralUnion } from "./types.ts";
import type { Genre, Medium, RatingComponent, RatingType, Tag } from "./constants.ts";

export type ContentRatingLabel = LiteralUnion<
  "전체 이용가" | "7세 이용가" | "12세 이용가" | "15세 이용가" | "성인 이용가"
>;

/** 나이 등급(숫자). undefined는 애초에 등급이 없다는 의미일 수도 있음 */
export type AgeRating = LiteralUnion<0 | 7 | 12 | 15 | 19, number>;

/**
 * 시청 권한 유형. free=무료, svod=구독, avod=광고형.
 * null은 구매전용(TVOD 대여/소장)이거나 판권 만료.
 * episode_products로 구매 가능 여부 판별 가능.
 */
export type AccessType = LiteralUnion<"free" | "svod" | "avod"> | null;

export interface RawImage {
  option_name?: LiteralUnion<"home_default" | "home_custom">;
  img_url?: string;
  crop_ratio?: string;
}

export interface RawHighlightVideo {
  content_id?: string;
  dash_url?: string;
  hls_url?: string;
}

export interface RawRating {
  rating?: AgeRating;
  rating_type?: RatingType | null;
  classification_number?: string;
  broadcast_channel_name?: string;
  broadcast_date?: string | null;
  rating_components?: RatingComponent[];
}

export interface RawPerson {
  name?: string;
  role?: string;
}

export interface RawCast {
  character_name?: string;
  voice_actor_names?: string[];
}

export interface RawProfileBrief {
  id: number;
  name: string;
  image: string;
  profile_rank?: { rank?: number; continued_membership_days?: number | null };
}

export interface RawItem {
  id: number;
  uid: string;
  name: string;
  content: string | null;
  description: string | null;
  genre: Genre[];
  medium: Medium;
  images: RawImage[];
  logo_img: string | null;
  color_code: string | null;
  tags: Tag[];
  release_weekdays: string[];
  latest_episode_release_datetime: string | null;
  avg_rating: number;
  air_year_quarter: string | null;
  copyright: string;
  notice: string;
  production: string | null;
  series_id: number | null;
  expire_datetime: string | null;
  max_episode_rating: RawRating;
  directors: RawPerson[];
  casts: RawCast[];
  production_companies: { name?: string }[];
  author: unknown[];
  illustrator: unknown[];
  awards: string[];
  highlight_video: RawHighlightVideo | null;
  simulcast_channel: unknown | null;
  is_adult: boolean;
  is_uncensored: boolean;
  is_dubbed: boolean;
  is_laftel_only: boolean;
  is_laftel_original: boolean;
  is_ending: boolean;
  is_exclusive: boolean;
  is_avod: boolean;
  is_svod: boolean;
  is_new_release: boolean;
  is_upcoming_release: boolean;
  is_episode_existed: boolean;
  is_viewing: boolean;
}

/** discover/related/daily/keyword/홈랭킹 등 목록 카드. 필드 부분집합, 이름 상이(genres/img). */
export interface RawItemCard {
  id: number;
  name?: string;
  img?: string;
  cropped_img?: string;
  home_img?: string;
  home_cropped_img?: string;
  images?: RawImage[];
  content_rating?: ContentRatingLabel | number;
  rating?: number;
  rating_type?: RatingType;
  genres?: Genre[];
  medium?: Medium;
  highlight_video?: RawHighlightVideo | null;
  average_score?: number;
  distributed_air_time?: string;
  latest_episode_created?: string | null;
  latest_published_datetime?: string | null;
  is_adult?: boolean;
  is_uncensored?: boolean;
  is_dubbed?: boolean;
  is_viewing?: boolean;
  is_laftel_only?: boolean;
  is_laftel_original?: boolean;
  is_exclusive?: boolean;
  is_avod?: boolean;
  is_ending?: boolean;
  is_episode_existed?: boolean;
  is_expired?: boolean;
}

export type RawItemLike = RawItem | RawItemCard;

export interface RawItemUserState {
  continue_episode_id: number | null;
  is_wish: boolean;
  is_hate: boolean;
}

export interface RawItemStatistics {
  average_score: string;
  count_score: number;
  count_score_05: number;
  count_score_10: number;
  count_score_15: number;
  count_score_20: number;
  count_score_25: number;
  count_score_30: number;
  count_score_35: number;
  count_score_40: number;
  count_score_45: number;
  count_score_50: number;
}

export interface RawEpisodeProduct {
  id?: number;
  name?: string;
  list_price?: number;
  period?: string;
  promotion?: unknown | null;
}

export interface RawEpisode {
  id: number;
  title: string;
  subject: string | null;
  description: string;
  episode_num: string;
  episode_order: number;
  thumbnail_path: string | null;
  has_preview: boolean;
  item_expire_datetime: string | null;
  in_app_download: boolean;
  is_avod: boolean;
  is_free: boolean;
  is_viewing: boolean;
  published_datetime: string | null;
  running_time: string;
  progressbar: number | null;
  episode_products: RawEpisodeProduct[];
  rating: RawRating;
  access_info_list: unknown[];
  access_type: AccessType;
  is_final: boolean;
}

export interface RawPlaybackInfo {
  op_start?: number | null;
  op_end?: number | null;
  ed_start?: number | null;
  ed_end?: number | null;
  episode_id?: number;
  episode_num?: string;
  action_time?: number;
  progressbar?: number | null;
  access_type?: AccessType;
  episode_type?: string;
}

export interface RawProtectedStreamingInfo {
  content_id?: string;
  access_type?: AccessType;
  widevine_token?: string | null;
  fairplay_token?: string | null;
  playready_token?: string | null;
  dash_url?: string;
  hls_url?: string;
  subtitle_url?: string | null;
}

export interface RawPublicStreamingInfo {
  dash_preview_url?: string | null;
  hls_preview_url?: string | null;
  thumbnail?: string | null;
  subtitle_preview_url?: string | null;
}

export interface RawStreamInfo {
  is_cartoon_network?: boolean;
  playback_info?: RawPlaybackInfo;
  products_info?: { point?: number; products?: RawEpisodeProduct[] };
  protected_streaming_info?: RawProtectedStreamingInfo | null;
  public_streaming_info?: RawPublicStreamingInfo | null;
  play_log_id?: number;
  next_episode?: { id?: number; episode_num?: string } | null;
}

export interface RawComment {
  id: number;
  parent_comment_id: number | null;
  profile: RawProfileBrief;
  content: string;
  item?: { id?: number; name?: string; medium?: Medium; rating?: number };
  episode?: { id?: number; subject?: string | null; episode_num?: string; thumbnail_path?: string | null };
  shorts?: unknown | null;
  created: string;
  modified: string;
  count_like: number;
  count_reply_comment: number;
  is_click_like: boolean;
  is_spoiler: boolean;
}

export interface RawReview {
  id: number | null;
  profile?: RawProfileBrief;
  content: string;
  score: number;
  item?: number | null;
  created: string | null;
  modified: string | null;
  count_like: number;
  is_click_like: boolean;
  is_spoiler: boolean;
}

export interface RawProfile {
  id: number;
  account_id: number;
  user_id?: number;
  profile_uid?: string;
  name: string;
  image: string;
  status: string;
  profile_rank: { rank?: number; continued_membership_days?: number | null };
  is_locked: boolean;
  is_for_kids?: boolean;
  content_rating: AgeRating;
  is_default: boolean;
  is_main: boolean;
  hidden_genres?: string[];
}

export interface RawAccount {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  verified_email?: string;
  is_duplicated_email?: boolean;
  has_password?: boolean;
  certified?: boolean;
  is_adult?: boolean;
  is_agree_to_terms?: boolean;
  account_types?: string[];
  asset_point?: number;
  has_pay_password?: boolean;
  iap_uuid?: string;
}

export interface RawProfileStatistics {
  finished_item_count?: number;
  rating_count?: number;
  short_review_count?: number;
  comment_count?: number;
}

export interface RawContinueWatching {
  play_next: boolean;
  progress: number;
  item: RawItemCard & { uid?: string; content?: string };
  episode?: RawEpisode;
}

export interface RawAuth {
  user: RawAccount;
  key: string;
  method: LiteralUnion<"email" | "google" | "kakao">;
  is_restored: boolean;
  is_registered: boolean;
}

export interface RawStatus {
  status?: LiteralUnion<"online" | "maintenance">;
  ip?: string;
  country_code?: string;
  ios_version?: { current?: string; required?: string; required_build_number?: number };
  android_version?: { current?: string; required?: string; required_build_number?: number };
  local_ad?: boolean;
  env?: LiteralUnion<"production" | "staging">;
}

export interface RawCarousel {
  id?: number;
  web_img?: string;
  mobile_img?: string;
  logo_img?: string;
  content?: string;
  label?: string;
  button_text?: string;
  is_adult?: boolean;
  item_destination?: number | null;
  event_destination?: number | null;
  external_destination?: string | null;
}

export interface RawNotification {
  id?: number;
  type?: string;
  notification_type?: string;
  status?: LiteralUnion<"read" | "unread">;
  extra_data?: { type?: string; rating?: number; item_id?: number; episode_id?: number };
  title?: string;
  description?: string;
  content?: string;
  icon?: string;
  image?: string;
  created?: string;
  end_datetime?: string | null;
}

export interface RawEvent {
  id?: number;
  name?: string;
  type?: string;
  img?: string;
  banner_img?: string;
  start_datetime?: string;
  end_datetime?: string;
  rating?: number;
  status?: string;
  contents?: { blocks?: unknown[] };
}

export interface RawLiveProgram {
  id?: number;
  start_datetime?: string;
  end_datetime?: string;
  title?: string;
  episode_title?: string;
  broadcast_type?: LiteralUnion<"replay" | "original">;
  content_rating?: number;
  series?: number | null;
  item?: number | null;
  item_name?: string | null;
}

export interface RawLiveChannel {
  channel?: {
    name?: string;
    display_name?: string;
    logo?: string;
    logo_square?: string;
    logo_sharing?: string;
    dash_url?: string;
    hls_url?: string;
  };
  current_program?: RawLiveProgram;
  current_thumbnail?: string;
}

export interface RawMembershipProduct {
  id?: number;
  name?: string;
  membership_type?: LiteralUnion<"basic" | "premium">;
  list_price?: number;
  period?: string;
  promotion?: unknown | null;
  provider?: string;
  is_active_renewable?: boolean;
}

export interface RawMembership {
  product?: RawMembershipProduct;
  promotion?: unknown | null;
  expire_datetime?: string;
  max_profile_count?: number;
  upgrade_type?: string;
  purchase_token?: string;
}

/** reserved(예약된 다음 결제)는 current와 모양이 다름: status/next_payment_date/billing_info. */
export interface RawReservedMembership {
  status?: string;
  next_payment_date?: string;
  product?: RawMembershipProduct;
  billing_info?: RawBillingInfo | null;
  on_hold_info?: unknown | null;
  pg_on_hold_info?: unknown | null;
}

export interface RawBillingInfo {
  id?: number;
  created?: string;
  modified?: string;
  pg_type?: string;
  billing_type?: string;
  card_name?: string | null;
  card_number?: string | null;
  phone_number?: string | null;
  is_svod_billing_info?: boolean;
}

export interface RawStoreProduct {
  product_id: number;
  product_no: number;
  product_code?: string;
  thumbnail_url?: string;
  small_image_url?: string;
  medium_image_url?: string;
  product_name?: string;
  price?: number;
  supply_price?: number;
  discount_rate?: number;
  is_displayed?: boolean;
  is_selling?: boolean;
  is_sold_out?: boolean;
  is_new_product?: boolean;
  product_type?: string;
  classification?: { id: number; code: string; name: string };
  badges?: string[];
  badges_with_meta?: {
    code: string;
    text: string;
    background_color?: string;
    color?: string;
    icon?: string | null;
  }[];
  [k: string]: unknown;
}

export interface RawItemRequest {
  id: number;
  created: string;
  modified: string;
  status: boolean;
  user: number;
  item: number;
}

export interface RawPlayHistoryEntry extends RawItemCard {
  type?: string;
  genre?: Genre[];
  last_played_episode_info?: {
    episode_id: number;
    episode_num: string;
    episode_img: string | null;
    progressbar: number | null;
  };
}

export interface RawNotice {
  id: number;
  title: string;
  zendesk_url: string;
  published_datetime: string;
}

export interface RawEventDraw {
  id: number;
  condition: string;
  min_profile_level: number | null;
  requires_third_party_consent: boolean;
  third_party_company_name: string;
  requires_address: boolean;
}

export interface RawStoreClassification {
  id: number;
  name: string;
  logo_image_url: string;
}

export interface RawHomeCollection {
  home_collection_id: number;
  name: string;
  collection_type: string;
  layout_type: string;
  more_link_url: string;
  image: { title: string; description: string; image_url: string; image_link_url: string } | null;
}
