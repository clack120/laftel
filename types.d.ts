export type ItemV3 = {
  id: number;
  name: string;
  /** 애니메이션 내용 줄거리 */
  content: string | null;
  /** 이용가 등급 (만 나이) */
  rating: RatingV2["rating"];
  rating_type: RatingV2["rating_type"];
  is_adult: boolean;
  /** 검열이 덜한 버전인지 */
  is_uncensored: boolean;
  is_dubbed: boolean;
  is_laftel_only: boolean;
  is_laftel_original: boolean;
  is_ending: boolean;
  /** 광고 무료인가[?] */
  is_avod: boolean;
  is_svod: boolean;
  is_new_release: boolean;
  is_upcoming_release: boolean;
  is_episode_existed: boolean;
  medium: "TVA" | "OVA" | string;
  images: {
    option_name: string;
    img_url: string;
    crop_ratio: string;
  }[];
  genre: string[];
  release_weekdays: string[];
  latest_episode_release_datetime: string;
  /** 평점 ( 0-5 ) */
  avg_rating: number;
  avod_status: string;
  logo_img: string | null;
  color_code: string | null;
  description: string | null;
  is_viewing: boolean;
  highlight_video: {
    content_id: string;
    dash_url: string;
    hls_url: string;
  };
  awards: string[]; // FIXME: any[]는 맞음
  notice: string;
  tags: string[];
  production: string;
  air_year_quarter: string;
  copyright: string;
  author: string[];
  illustrator: string[];
  expire_datetime: string;
  series_id: int;
  max_episode_rating: RatingV2;
  directors: {
    name: string;
    role: string;
  }[];
  casts: {
    character_name: string;
    voice_actor_names: string[];
  }[];
  production_companies: {
    name: string;
  }[];
};

export type EpisodesV2 = {
  count: number;
  next: string | null;
  previous: string | null;
  results: EpisodeV2[];
};

//https://api.laftel.net/api/external_products/v1/naver/list/?item_id=애니ID&limit=12&offset=0
export type ExternalProducts = {
  count: number;
  next: string | null | any;
  previous: string | null | any;
  results: ExternalProduct[];
};
export type ExternalProduct = {
  id: int;
  product_type: "GOODS" | string;
  shop_type: "NAVER_STORE" | string;
  naver_external_product?: {
    id: int; //  위에 id랑 같은듯
    name: string; //상품이름
    sale_price: int;
    discounted_price: int;
    representative_image_url: string;
    discount_rate: int;
    purchase_page_url: string;
    badges: any[];
  };
};

export type EpisodeV2 = {
  id: number;
  /** 애니메이션 이름 */
  title: string;
  /** 에피소드 이름 */
  subject: string;
  description: string;
  episode_num: string;
  episode_order: number;
  thumbnail_path: string;
  has_preview: boolean;
  access_info_list: [];
  running_time: string; // 0:23:50.433000 같은
  progressbar: number | null;
  item_expire_datetime: string | null;
  in_app_download: boolean;
  is_avod: boolean;
  is_free: boolean;
  is_viewing: boolean;
  access_type: "avod" | string;
  is_available: true;
  products: any[];
  episode_products: EpisodeProductV2[];
  published_datetime: string;
  rating: RatingV2;
};

export type RatingV2 = {
  /** 이용가 등급 (만 나이) */
  rating: 19 | 15 | int;
  /** 등급 분류 기관 (예: 방송통신심의위원회) */
  rating_type: string;
  classification_number: string; // idk
  broadcast_channel_name: string;
  broadcast_date: string;
  rating_components: string[]; // FIXME: 진짜 string[] 인지는 모르고 일단 any[]는 맞음
};

export type EpisodeProductV2 = {
  id: number;
  name: string;
  list_price: number;
  period: string;
  promotion: string | null;
};
