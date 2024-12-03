interface HighlightVideo {
  content_id: string;
  dash_url: string;
  hls_url: string;
}

interface Image {
  crop_ratio: string;
  img_url: string;
  option_name: string;
}

interface ItemV3 {
  id: number;
  name: string;
  img: string;
  cropped_img: string;
  home_img: string;
  home_cropped_img: string;
  images: Image[];
  content_rating: string;
  rating: number;
  rating_type: string | null;
  is_adult: boolean;
  genres: string[];
  medium: string;
  distributed_air_time: string | null;
  is_laftel_only: boolean;
  is_uncensored: boolean;
  is_dubbed: boolean;
  is_avod: boolean;
  avod_status: string;
  is_viewing: boolean;
  latest_episode_created: string;
  latest_published_datetime: string;
  is_episode_existed: boolean;
  is_expired: boolean;
  highlight_video: HighlightVideo;
}
