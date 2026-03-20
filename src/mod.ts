// export * from "./types/raw.ts";
export * from "./types/constants.ts";
export * from "./types/models.ts";
export * from "./client/client.ts";
export * from "./client/mapper.ts";
/** Returns Widevine PSSH */
export function getPssh(mpdText: string): string | null {
  const widevineId = "edef8ba9-79d6-4ace-a3c8-27dcd51d21ed";
  const startIdx = mpdText.toLowerCase().indexOf(widevineId);

  if (startIdx === -1) return null;

  const psshStartTag = "<cenc:pssh>";
  const psshEndTag = "</cenc:pssh>";

  const psshStart = mpdText.indexOf(psshStartTag, startIdx);
  const psshEnd = mpdText.indexOf(psshEndTag, psshStart);

  if (psshStart !== -1 && psshEnd !== -1)
    return mpdText.slice(psshStart + psshStartTag.length, psshEnd).trim();

  return null;
}
