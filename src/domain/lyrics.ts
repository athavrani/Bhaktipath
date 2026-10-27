export interface LyricLine {
  id: string;
  order: number;
  startMs: number;
  endMs?: number | null;
  text: string;
}

export interface LyricValidationIssue {
  index: number;
  message: string;
}

/** Returns the active line at a playback position, or null when no line is active. */
export function findActiveLyricLine(
  lines: readonly LyricLine[],
  positionMs: number,
): LyricLine | null {
  if (!Number.isFinite(positionMs) || positionMs < 0 || lines.length === 0) return null;

  // Lines are expected to be sorted by startMs. Binary search for the last start <= position.
  let low = 0;
  let high = lines.length - 1;
  let candidate = -1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (lines[mid].startMs <= positionMs) {
      candidate = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  if (candidate < 0) return null;

  const line = lines[candidate];
  const nextStart = lines[candidate + 1]?.startMs;
  const effectiveEnd = line.endMs ?? nextStart;
  if (effectiveEnd != null && positionMs >= effectiveEnd) return null;
  return line;
}

/** Validate ordering and timestamps before persisting lyrics. */
export function validateLyricLines(lines: readonly LyricLine[]): LyricValidationIssue[] {
  const issues: LyricValidationIssue[] = [];
  let previousStart = -1;

  lines.forEach((line, index) => {
    if (!Number.isFinite(line.startMs) || line.startMs < 0) {
      issues.push({ index, message: 'startMs must be a finite non-negative number.' });
    }
    if (line.startMs < previousStart) {
      issues.push({ index, message: 'Lines must be ordered by non-decreasing startMs.' });
    }
    if (line.endMs != null && (!Number.isFinite(line.endMs) || line.endMs <= line.startMs)) {
      issues.push({ index, message: 'endMs must be greater than startMs.' });
    }
    if (!line.text.trim()) issues.push({ index, message: 'Lyric text cannot be blank.' });
    previousStart = line.startMs;
  });

  return issues;
}