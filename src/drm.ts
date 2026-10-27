import type { Laftel } from "./client.ts";
import type { PlaybackDevice } from "./api/episodes.ts";
import type { StreamInfo } from "./models.ts";

export const PALLYCON_LICENSE_URL = "https://license.pallycon.com/ri/licenseManager.do";

export interface LicenseInfo {
  system: "widevine" | "fairplay" | "playready";
  dashUrl?: string;
  hlsUrl?: string;
  contentId?: string;
  assetId?: number;
  pssh: string | null;
  licenseUrl: string;
  licenseHeaders: Record<string, string>;
}

export function getPssh(mpd: string): string | null {
  const wv = "edef8ba9-79d6-4ace-a3c8-27dcd51d21ed";
  for (const block of mpd.matchAll(/<ContentProtection\b([^>]*?)(?:\/>|>([\s\S]*?)<\/ContentProtection\s*>)/g)) {
    if (!block[1]?.toLowerCase().includes(wv)) continue;
    const pssh = block[2]?.match(/<cenc:pssh\b[^>]*>([^<]*)<\/cenc:pssh\s*>/)?.[1]?.trim();
    if (pssh) return pssh;
  }
  return null;
}

export async function getLicenseInfo(client: Laftel, episodeId: number, device?: PlaybackDevice): Promise<LicenseInfo> {
  const stream = await client.episodes.video(episodeId, device);
  return fromStream(client, stream);
}

export async function fromStream(client: Laftel, stream: StreamInfo): Promise<LicenseInfo> {
  const drm = stream.drm;
  if (!drm) throw new Error("laftel/drm: no protected stream (free/preview content or not entitled)");

  const dashUrl = stream.dash;
  const pssh = dashUrl ? getPssh(await client.api.text(dashUrl, { anon: true })) : null;

  return {
    system: drm.system,
    dashUrl,
    hlsUrl: stream.hls,
    contentId: drm.contentId,
    assetId: drm.assetId,
    pssh,
    licenseUrl: PALLYCON_LICENSE_URL,
    licenseHeaders: {
      "pallycon-customdata-v2": drm.token,
      "Origin": "https://laftel.net",
      "Referer": "https://laftel.net/",
    },
  };
}
