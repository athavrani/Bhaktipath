export interface TimestampedLyric {
  time: number;
  text: string;
}

/** Parse basic LRC lines such as [01:23.45]Lyric text. Invalid/metadata lines are ignored. */
export function parseTimestampedLyrics(input: string): TimestampedLyric[] {
  return input.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.+?)\s*$/);
    if (!match) return [];
    const fraction = match[3] ? Number(`0.${match[3]}`) : 0;
    const time = Number(match[1]) * 60 + Number(match[2]) + fraction;
    if (!Number.isFinite(time) || Number(match[2]) > 59) return [];
    return [{ time, text: match[4] }];
  }).sort((a, b) => a.time - b.time);
}

/** Returns the most recent lyric whose timestamp is not later than the current playback time. */
export function findActiveTimestampedLyric(
  lines: readonly TimestampedLyric[],
  currentTimeSeconds: number,
): string | null {
  if (!Number.isFinite(currentTimeSeconds) || currentTimeSeconds < 0) return null;
  let active: string | null = null;
  for (const line of lines) {
    if (currentTimeSeconds < line.time) break;
    active = line.text;
  }
  return active;
}