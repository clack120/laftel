export function text(s: string | null | undefined): string | undefined {
  if (!s) return undefined;
  const out = s.indexOf("\r") === -1 ? s.trim() : s.replaceAll("\r\n", "\n").replaceAll("\r", "\n").trim();
  return out || undefined;
}

export function kst(s: string | null | undefined): Date | null {
  if (!s) return null;
  const iso = s.length > 10 && s[10] === " " ? s.slice(0, 10) + "T" + s.slice(11) : s;
  const stamped = hasZone(iso) ? iso : iso + "+09:00";
  const d = new Date(stamped);
  return isNaN(d.getTime()) ? null : d;
}

function hasZone(iso: string): boolean {
  if (iso.endsWith("Z")) return true;
  for (let i = 11; i < iso.length; i++) {
    const c = iso[i];
    if (c === "+" || c === "-") return true;
  }
  return false;
}

/** @example duration("1:11:55.333000") // 4315.333 */
export function duration(s: string | null | undefined): number | undefined {
  if (!s) return undefined;
  const parts = s.split(":");
  if (parts.length !== 3) return undefined;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  const sec = Number(parts[2]);
  if (isNaN(h) || isNaN(m) || isNaN(sec)) return undefined;
  return h * 3600 + m * 60 + sec;
}

/** @example hms(4315) // "01:11:55" */
export function hms(seconds: number): string {
  const t = Math.max(0, Math.floor(seconds));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

function pad2(n: number): string {
  return n < 10 ? "0" + n : "" + n;
}

/** @example assetId("asset_110393") // 110393 */
export function assetId(contentId: string | null | undefined): number | undefined {
  if (!contentId || !contentId.startsWith("asset_")) return undefined;
  const n = Number(contentId.slice(6));
  return isNaN(n) ? undefined : n;
}

/**
 * "N화" 접미사 제거. 숫자가 아닐 수 있어 문자열 라벨로 취급("특별편" 등).
 * @example episodeLabel("1화") // "1"
 * @example episodeLabel("1") // "1"
 */
export function episodeLabel(episodeNum: string): string {
  return episodeNum.endsWith("화") ? episodeNum.slice(0, -1) : episodeNum;
}
