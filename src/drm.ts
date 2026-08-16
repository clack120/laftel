import type { Laftel } from "./client.ts";
import type { StreamInfo } from "./models.ts";

export const PALLYCON_LICENSE_URL = "https://license.pallycon.com/ri/licenseManager.do";

const LICENSE_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Googlebot/0";

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
  const at = mpd.toLowerCase().indexOf(wv);
  if (at === -1) return null;
  const open = mpd.indexOf("<cenc:pssh", at);
  if (open === -1) return null;
  const start = mpd.indexOf(">", open);
  const end = mpd.indexOf("</cenc:pssh>", start);
  if (start === -1 || end === -1) return null;
  return mpd.slice(start + 1, end).trim();
}

export async function getLicenseInfo(client: Laftel, episodeId: number, device = "Web"): Promise<LicenseInfo> {
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
      "User-Agent": LICENSE_UA,
      "Origin": "https://laftel.net",
      "Referer": "https://laftel.net/",
    },
  };
}
