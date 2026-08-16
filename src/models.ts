import { assetId, duration, episodeLabel, kst, text } from "./normalize.ts";
import type { AccessType, AgeRating } from "./raw.ts";
import type { Medium } from "./constants.ts";
import type {
  RawAccount,
  RawBillingInfo,
  RawComment,
  RawContinueWatching,
  RawEpisode,
  RawEpisodeProduct,
  RawItem,
  RawItemLike,
  RawLiveChannel,
  RawLiveProgram,
  RawProfile,
  RawProfileBrief,
  RawProfileStatistics,
  RawReview,
  RawStreamInfo,
} from "./raw.ts";

/** 결제 수단 (일부 정보는 마스킹된 상태로 옴) */
export interface BillingInfo {
  id?: number;
  pgType?: string;
  billingType?: string;
  cardName?: string | null;
  cardNumber?: string | null;
  phoneNumber?: string | null;
  svodBilling?: boolean;
}

export function toBillingInfo(r: RawBillingInfo): BillingInfo {
  return {
    id: r.id,
    pgType: r.pg_type,
    billingType: r.billing_type,
    cardName: r.card_name,
    cardNumber: r.card_number,
    phoneNumber: r.phone_number,
    svodBilling: r.is_svod_billing_info,
  };
}

export interface AccountInfo {
  /** users.*(continueWatching/playHistory 등) 호출에 쓰는 user id. */
  id: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  /** 인증 완료된 이메일(미인증이면 빈 값). */
  verifiedEmail?: string;
  duplicateEmail?: boolean;
  hasPassword?: boolean;
  /** 본인인증(certify) 완료 여부. */
  certified?: boolean;
  adult?: boolean;
  agreedToTerms?: boolean;
  /** 연결된 로그인 수단(email/google/kakao/apple 등). */
  accountTypes: string[];
  /** 보유 포인트 잔액. */
  pointBalance?: number;
  hasPayPassword?: boolean;
  /** 인앱결제(IAP) 계정 식별자. 모바일 앱 전용, 웹에선 미사용. */
  iapUuid?: string;
}

export function toAccount(r: RawAccount): AccountInfo {
  return {
    id: r.id,
    username: r.username,
    firstName: r.first_name,
    lastName: r.last_name,
    email: r.email,
    verifiedEmail: r.verified_email,
    duplicateEmail: r.is_duplicated_email,
    hasPassword: r.has_password,
    certified: r.certified,
    adult: r.is_adult,
    agreedToTerms: r.is_agree_to_terms,
    accountTypes: r.account_types ?? [],
    pointBalance: r.asset_point,
    hasPayPassword: r.has_pay_password,
    iapUuid: r.iap_uuid,
  };
}

export interface ProfileStatistics {
  /** 정주행 완료작 수 */
  finishedCount: number;
  /** 별점 준 작품 수 */
  ratingCount: number;
  /** 한줄평 수 */
  reviewCount: number;
  commentCount: number;
}

export function toProfileStatistics(r: RawProfileStatistics): ProfileStatistics {
  return {
    finishedCount: r.finished_item_count ?? 0,
    ratingCount: r.rating_count ?? 0,
    reviewCount: r.short_review_count ?? 0,
    commentCount: r.comment_count ?? 0,
  };
}

const THUMB = "https://thumbnail.laftel.net/";

function abs(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return url.startsWith("http") ? url : THUMB + url;
}

export interface ImageSet {
  default?: string;
  custom?: string;
  logo?: string;
}

export interface TimeRange {
  start: number;
  end: number;
}

function images(raw: RawItemLike): ImageSet {
  const set: ImageSet = {};
  const list = (raw as RawItem).images ?? [];
  for (const img of list) {
    if (img.option_name === "home_default") set.default = abs(img.img_url);
    else if (img.option_name === "home_custom") set.custom = abs(img.img_url);
  }
  if (!set.default) set.default = abs((raw as { img?: string }).img) ?? abs((raw as { home_img?: string }).home_img);
  const logo = (raw as RawItem).logo_img;
  if (logo) set.logo = abs(logo);
  return set;
}

export interface CastMember {
  character?: string;
  voiceActors: string[];
}

/** 작품 소개용 대표 영상(PV/티저). */
export interface HighlightVideo {
  contentId?: string;
  assetId?: number;
  dash?: string;
  hls?: string;
}

/** 에피소드 개별 구매 상품(TVOD 대여/소장). */
export interface EpisodeProduct {
  id?: number;
  name?: string;
  listPrice?: number;
  period?: string;
}

export function toEpisodeProduct(r: RawEpisodeProduct): EpisodeProduct {
  return { id: r.id, name: r.name, listPrice: r.list_price, period: r.period };
}

export class Item {
  readonly id: number;
  readonly uid?: string;
  readonly name?: string;
  readonly description?: string;
  readonly genres: string[];
  readonly tags: string[];
  readonly format?: Medium;
  /** 방영/개봉 시기 라벨(파싱용 아님). 예: "2020년 4분기", 다분기작은 "1996년, 1997년" */
  readonly airPeriod?: string;
  readonly images: ImageSet;
  readonly thumbnail?: string;
  readonly colorCode?: string;
  readonly score?: number;
  readonly ageRating?: AgeRating;
  readonly seriesId?: number | null;
  readonly releaseWeekdays?: string[];
  readonly latestEpisodeAt: Date | null;
  readonly directors: string[];
  readonly cast: CastMember[];
  readonly studios: string[];
  readonly highlightVideo: HighlightVideo | null;
  // 플래그는 카드 응답이 생략할 수 있음
  readonly adult?: boolean;
  readonly dubbed?: boolean;
  readonly uncensored?: boolean;
  readonly completed?: boolean;
  /** 선독점(최초 공개만 독점) */
  readonly preExclusive?: boolean;
  /** 라프텔 독점 배급 (프론트에서의 배지 "ONLY") */
  readonly laftelOnly?: boolean;
  /** 라프텔 자체 제작 애니 */
  readonly laftelOriginal?: boolean;
  readonly avod?: boolean;
  readonly svod?: boolean;
  readonly hasEpisodes?: boolean;
  readonly newRelease?: boolean;
  readonly upcoming?: boolean;
  readonly viewable?: boolean;

  constructor(readonly raw: RawItemLike) {
    const r = raw as RawItem & { genres?: string[]; average_score?: number; rating?: number };
    this.id = raw.id;
    this.uid = r.uid;
    this.name = text(raw.name);
    this.description = text(r.content ?? r.description);
    this.genres = r.genre ?? r.genres ?? [];
    this.tags = r.tags ?? [];
    this.format = r.medium;
    this.airPeriod = r.air_year_quarter ?? undefined;
    this.images = images(raw);
    this.thumbnail = this.images.default ?? this.images.custom;
    this.colorCode = r.color_code ?? undefined;
    this.score = r.avg_rating ?? r.average_score;
    const cr = (raw as { content_rating?: unknown }).content_rating;
    this.ageRating = typeof cr === "number" ? cr : r.rating ?? r.max_episode_rating?.rating;
    this.seriesId = r.series_id;
    this.releaseWeekdays = r.release_weekdays;
    this.latestEpisodeAt = kst(
      r.latest_episode_release_datetime ?? (raw as { latest_published_datetime?: string }).latest_published_datetime,
    );
    this.directors = (r.directors ?? []).map((d) => d.name ?? "").filter(Boolean);
    this.cast = (r.casts ?? []).map((c) => ({ character: c.character_name, voiceActors: c.voice_actor_names ?? [] }));
    this.studios = (r.production_companies ?? []).map((p) => p.name ?? "").filter(Boolean);
    this.highlightVideo = r.highlight_video
      ? {
        contentId: r.highlight_video.content_id,
        assetId: assetId(r.highlight_video.content_id),
        dash: r.highlight_video.dash_url,
        hls: r.highlight_video.hls_url,
      }
      : null;
    this.adult = r.is_adult;
    this.dubbed = r.is_dubbed;
    this.uncensored = r.is_uncensored;
    this.completed = r.is_ending;
    this.preExclusive = r.is_exclusive;
    this.laftelOnly = r.is_laftel_only;
    this.laftelOriginal = r.is_laftel_original;
    this.avod = r.is_avod;
    this.svod = r.is_svod;
    this.hasEpisodes = r.is_episode_existed;
    this.newRelease = r.is_new_release;
    this.upcoming = r.is_upcoming_release;
    this.viewable = r.is_viewing;
  }
}

export class Episode {
  readonly id: number;
  /** 화수 라벨(숫자 아닐 수 있음). 예: "1", "25", "특별편" */
  readonly episodeLabel: string;
  readonly title?: string;
  readonly workTitle?: string;
  readonly thumbnail?: string;
  readonly durationSeconds?: number;
  readonly ageRating?: AgeRating;
  readonly products: EpisodeProduct[];
  readonly free: boolean;
  readonly viewable: boolean;
  readonly downloadable: boolean;
  readonly avod: boolean;
  readonly hasPreview: boolean;
  /** 시리즈 마지막 화 여부 */
  readonly finale: boolean;
  readonly publishedAt: Date | null;
  readonly expiresAt: Date | null;
  readonly accessType: AccessType;

  constructor(readonly raw: RawEpisode) {
    this.id = raw.id;
    this.episodeLabel = episodeLabel(raw.episode_num);
    this.title = text(raw.subject);
    this.workTitle = text(raw.title);
    this.thumbnail = raw.thumbnail_path || undefined;
    this.durationSeconds = duration(raw.running_time);
    this.ageRating = raw.rating?.rating === -1 ? undefined : raw.rating?.rating;
    this.products = (raw.episode_products ?? []).map(toEpisodeProduct);
    this.free = raw.is_free;
    this.viewable = raw.is_viewing;
    this.downloadable = raw.in_app_download;
    this.avod = raw.is_avod;
    this.hasPreview = raw.has_preview;
    this.finale = raw.is_final;
    this.publishedAt = kst(raw.published_datetime);
    this.expiresAt = kst(raw.item_expire_datetime);
    this.accessType = raw.access_type;
  }
}

export interface Drm {
  system: "widevine" | "fairplay" | "playready";
  token: string;
  contentId?: string;
  assetId?: number;
  accessType?: AccessType;
}

export class StreamInfo {
  readonly drm: Drm | null;
  readonly dash?: string;
  readonly hls?: string;
  readonly subtitleUrl?: string;
  readonly previewDash?: string;
  readonly previewHls?: string;
  readonly thumbnail?: string;
  readonly opening: TimeRange | null;
  readonly ending: TimeRange | null;
  readonly playLogId?: number;
  readonly nextEpisodeId?: number;

  constructor(readonly raw: RawStreamInfo) {
    const p = raw.protected_streaming_info;
    const pub = raw.public_streaming_info;
    const pb = raw.playback_info;

    this.drm = drmOf(p);
    this.dash = p?.dash_url;
    this.hls = p?.hls_url;
    this.subtitleUrl = p?.subtitle_url ?? undefined;
    this.previewDash = pub?.dash_preview_url ?? undefined;
    this.previewHls = pub?.hls_preview_url ?? undefined;
    this.thumbnail = pub?.thumbnail ?? undefined;
    this.opening = range(pb?.op_start, pb?.op_end);
    this.ending = range(pb?.ed_start, pb?.ed_end);
    this.playLogId = raw.play_log_id;
    this.nextEpisodeId = raw.next_episode?.id;
  }
}

function drmOf(p: RawStreamInfo["protected_streaming_info"]): Drm | null {
  if (!p) return null;
  const system = p.widevine_token ? "widevine" : p.fairplay_token ? "fairplay" : p.playready_token ? "playready" : null;
  const token = p.widevine_token ?? p.fairplay_token ?? p.playready_token;
  if (!system || !token) return null;
  return { system, token, contentId: p.content_id, assetId: assetId(p.content_id), accessType: p.access_type };
}

function range(start?: number | null, end?: number | null): TimeRange | null {
  return start != null && end != null ? { start, end } : null;
}

export interface Author {
  id: number;
  name: string;
  avatar: string;
  rank?: number;
}

function author(p: RawProfileBrief): Author {
  return { id: p.id, name: p.name, avatar: p.image, rank: p.profile_rank?.rank };
}

export class Comment {
  readonly id: number;
  readonly parentId: number | null;
  readonly author: Author;
  readonly content?: string;
  readonly likes: number;
  readonly replyCount: number;
  readonly spoiler: boolean;
  readonly liked: boolean;
  readonly createdAt: Date | null;
  readonly modifiedAt: Date | null;
  readonly itemId?: number;
  readonly itemName?: string;
  readonly episodeId?: number;
  readonly episodeLabel?: string;

  constructor(readonly raw: RawComment) {
    this.id = raw.id;
    this.parentId = raw.parent_comment_id;
    this.author = author(raw.profile);
    this.content = text(raw.content);
    this.likes = raw.count_like;
    this.replyCount = raw.count_reply_comment;
    this.spoiler = raw.is_spoiler;
    this.liked = raw.is_click_like;
    this.createdAt = kst(raw.created);
    this.modifiedAt = kst(raw.modified);
    this.itemId = raw.item?.id;
    this.itemName = text(raw.item?.name);
    this.episodeId = raw.episode?.id;
    this.episodeLabel = raw.episode?.episode_num ? episodeLabel(raw.episode.episode_num) : undefined;
  }
}

export class Review {
  readonly id: number | null;
  readonly author?: Author;
  readonly content?: string;
  readonly score: number;
  readonly likes: number;
  readonly spoiler: boolean;
  readonly liked: boolean;
  readonly createdAt: Date | null;
  readonly modifiedAt: Date | null;
  readonly itemId?: number | null;

  constructor(readonly raw: RawReview) {
    this.id = raw.id;
    this.author = raw.profile ? author(raw.profile) : undefined;
    this.content = text(raw.content);
    this.score = raw.score;
    this.likes = raw.count_like;
    this.spoiler = raw.is_spoiler;
    this.liked = raw.is_click_like;
    this.createdAt = kst(raw.created);
    this.modifiedAt = kst(raw.modified);
    this.itemId = raw.item;
  }
}

export class Profile {
  readonly id: number;
  /** user-scoped API(users.continueWatching/playHistory 등)에 쓰는 id. 프로필마다 다름 */
  readonly userId?: number;
  /** 부모 계정 id. 한 계정의 프로필들이 공유 */
  readonly accountId: number;
  readonly name: string;
  readonly image: string;
  readonly status?: string;
  readonly rank?: number;
  /** list/get 응답엔 없음. my_profile에만 존재 */
  readonly kids?: boolean;
  readonly main: boolean;
  readonly default: boolean;
  readonly locked: boolean;
  readonly contentRating: AgeRating;

  constructor(readonly raw: RawProfile) {
    this.id = raw.id;
    this.userId = raw.user_id;
    this.accountId = raw.account_id;
    this.name = raw.name;
    this.image = raw.image;
    this.status = raw.status;
    this.rank = raw.profile_rank?.rank;
    this.kids = raw.is_for_kids;
    this.main = raw.is_main;
    this.default = raw.is_default;
    this.locked = raw.is_locked;
    this.contentRating = raw.content_rating;
  }
}

export class LiveProgram {
  readonly id?: number;
  readonly title?: string;
  readonly episodeTitle?: string;
  readonly startsAt: Date | null;
  readonly endsAt: Date | null;
  readonly rerun: boolean;
  readonly ageRating?: number;
  readonly seriesId?: number | null;
  readonly itemId?: number | null;

  constructor(readonly raw: RawLiveProgram) {
    this.id = raw.id;
    this.title = text(raw.title);
    this.episodeTitle = text(raw.episode_title);
    this.startsAt = kst(raw.start_datetime);
    this.endsAt = kst(raw.end_datetime);
    this.rerun = raw.broadcast_type === "replay";
    this.ageRating = raw.content_rating;
    this.seriesId = raw.series;
    this.itemId = raw.item;
  }
}

export class LiveChannel {
  readonly name?: string;
  readonly displayName?: string;
  readonly logo?: string;
  // 인증, DRM 없이 바로 재생 (해외 IP도 됨)
  readonly dash?: string;
  readonly hls?: string;
  readonly thumbnail?: string;
  readonly current: LiveProgram | null;

  constructor(readonly raw: RawLiveChannel) {
    const ch = raw.channel;
    this.name = ch?.name;
    this.displayName = ch?.display_name;
    this.logo = ch?.logo;
    this.dash = ch?.dash_url;
    this.hls = ch?.hls_url;
    this.thumbnail = raw.current_thumbnail;
    this.current = raw.current_program ? new LiveProgram(raw.current_program) : null;
  }
}

export class ContinueWatchingEntry {
  /** 0~1 float */
  readonly progressRatio: number;
  /** true=다음 화 처음부터, false=progressRatio 지점부터 이어보기 */
  readonly playNextEpisode: boolean;
  readonly item: Item;
  readonly episode?: Episode;

  constructor(readonly raw: RawContinueWatching) {
    this.progressRatio = raw.progress;
    this.playNextEpisode = raw.play_next;
    this.item = new Item(raw.item);
    this.episode = raw.episode ? new Episode(raw.episode) : undefined;
  }
}
