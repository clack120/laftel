import type { Http } from "../http.ts";
import { type AccountInfo, Profile, type ProfileStatistics, toAccount, toProfileStatistics } from "../models.ts";
import type { Paginated } from "../types.ts";
import type { RawAccount, RawProfile, RawProfileStatistics } from "../raw.ts";

export interface Avatar {
  id: number;
  name: string;
  image: string;
}

export interface AvatarCategory {
  id: number;
  name: string;
  images: Avatar[];
}

export interface ProfileToken {
  profileId: number;
  userId: number;
  token: string;
}

export interface HideableGenre {
  id: number;
  name: string;
  order: number;
  hidden: boolean;
}

export interface HideableGenres {
  maxHidden: number;
  genres: HideableGenre[];
}

export class Profiles {
  constructor(private http: Http) {}

  async me(): Promise<Profile> {
    return new Profile(await this.http.get<RawProfile>("profiles/v1/my_profile/"));
  }

  /** 주의: account.id는 메인 프로필의 user_id(users.* 호출에 쓰는 값). 프로필 id나 계정 pk와 다름. */
  async account(): Promise<AccountInfo> {
    return toAccount(await this.http.get<RawAccount>("profiles/v1/my_account/"));
  }

  async statistics(): Promise<ProfileStatistics> {
    return toProfileStatistics(await this.http.get<RawProfileStatistics>("profiles/v1/my_profile/statistics/"));
  }

  async list(): Promise<Profile[]> {
    const res = await this.http.get<RawProfile[] | { results?: RawProfile[] }>("profiles/v2/list/");
    const arr = Array.isArray(res) ? res : res.results ?? [];
    return arr.map((r) => new Profile(r));
  }

  async get(id: number): Promise<Profile> {
    return new Profile(await this.http.get<RawProfile>(`profiles/v2/${id}/`));
  }

  async token(id: number): Promise<ProfileToken> {
    const r = await this.http.get<{ id: number; user_id: number; token: string }>(`profiles/v1/${id}/token/`);
    return { profileId: r.id, userId: r.user_id, token: r.token };
  }

  async update(
    id: number,
    patch: { name?: string; imageId?: number; contentRating?: number; locked?: boolean },
  ): Promise<Profile> {
    const r = await this.http.patch<RawProfile>(`profiles/v2/${id}/`, {
      body: {
        name: patch.name,
        default_image_id: patch.imageId,
        content_rating: patch.contentRating,
        is_locked: patch.locked,
      },
    });
    return new Profile(r);
  }

  /** imageId는 avatars() 또는 avatarCategories()에서 가져옴. */
  async create(input: { name: string; imageId: number }): Promise<Profile> {
    const r = await this.http.post<RawProfile>("profiles/v2/list/", {
      body: { name: input.name, default_image_id: input.imageId },
    });
    return new Profile(r);
  }

  delete(id: number): Promise<void> {
    return this.http.del(`profiles/v3/${id}/`);
  }

  removePassword(id: number): Promise<void> {
    return this.http.del(`profiles/v1/${id}/password/`);
  }

  async hideableGenres(id: number): Promise<HideableGenres> {
    const r = await this.http.get<
      { max_hidden_genre_count: number; genres: { id: number; name: string; order: number; is_hidden: boolean }[] }
    >(`profiles/v1/${id}/hideable_genres/`);
    return {
      maxHidden: r.max_hidden_genre_count,
      genres: r.genres.map((g) => ({ id: g.id, name: g.name, order: g.order, hidden: g.is_hidden })),
    };
  }

  // 장르 하나를 숨김/해제 토글. hidden=true면 숨김 목록에 추가. 갱신된 숨김 목록을 반환.
  async setHiddenGenre(id: number, genreId: number, hidden: boolean): Promise<{ id: number; name: string }[]> {
    const r = await this.http.patch<{ hidden_genres: { id: number; name: string }[] }>(
      `profiles/v1/${id}/hidden_genres/`,
      { body: { genre_id: genreId, is_active: hidden } },
    );
    return r.hidden_genres ?? [];
  }

  checkPassword(id: number, password: string): Promise<void> {
    return this.http.post(`profiles/v1/${id}/check_password/`, { body: { password } });
  }

  setPassword(id: number, password: string): Promise<unknown> {
    return this.http.post(`profiles/v1/${id}/password/`, { body: { password } });
  }

  avatars(): Promise<Paginated<Avatar>> {
    return this.http.get("profiles/v1/images/", { anon: true });
  }

  async avatarCategories(): Promise<AvatarCategory[]> {
    const r = await this.http.get<{ results?: { category_id: number; category_name: string; images: Avatar[] }[] }>(
      "profiles/v2/images/",
      { anon: true },
    );
    return (r.results ?? []).map((c) => ({ id: c.category_id, name: c.category_name, images: c.images }));
  }
}
