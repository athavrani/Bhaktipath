import type { LyricLine } from './lyrics';

export const LYRIC_DOCUMENT_VERSION = 1 as const;

export type LyricLanguage = 'gu' | 'hi' | 'sa' | 'en' | 'other';
export type LyricSource = 'manual' | 'lrc-import' | 'generated-local' | 'generated-cloud';
export type LyricReviewStatus = 'draft' | 'reviewed';

export interface LyricDocument {
  schemaVersion: typeof LYRIC_DOCUMENT_VERSION;
  id: string;
  title: string;
  language: LyricLanguage;
  audio: {
    name: string;
    /** Optional URI hint only; imported picker/cache URIs may not survive app restarts. */
    uri?: string;
  };
  source: LyricSource;
  reviewStatus: LyricReviewStatus;
  lines: LyricLine[];
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
}

export interface LyricDocumentIssue {
  code: 'empty-title' | 'empty-audio-name' | 'empty-lyrics' | 'blank-line' |
    'invalid-timestamp' | 'out-of-order' | 'duplicate-timestamp' | 'invalid-end' |
    'duration-mismatch' | 'invalid-review-metadata';
  message: string;
  index?: number;
  severity: 'error' | 'warning';
}

export interface CreateLyricDocumentInput {
  id: string;
  title: string;
  language: LyricLanguage;
  audio: { name: string; uri?: string };
  source?: LyricSource;
  lines?: LyricLine[];
  now?: string;
}

/** Creates a versioned local document. Pass stable IDs and timestamps from the caller for testability. */
export function createLyricDocument(input: CreateLyricDocumentInput): LyricDocument {
  const now = input.now ?? new Date().toISOString();
  return {
    schemaVersion: LYRIC_DOCUMENT_VERSION,
    id: input.id,
    title: input.title.trim(),
    language: input.language,
    audio: { ...input.audio },
    source: input.source ?? 'manual',
    reviewStatus: 'draft',
    lines: (input.lines ?? []).map((line, index) => ({ ...line, order: index })),
    createdAt: now,
    updatedAt: now,
  };
}

/** Convert LRC text into an editable document. Invalid/non-LRC lines are ignored by the parser. */
export function lyricDocumentFromLrc(
  input: CreateLyricDocumentInput,
  lrcText: string,
): LyricDocument {
  const parsed = lrcText.split(/\r?\n/).flatMap((rawLine) => {
    const match = rawLine.match(/^\s*\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.+?)\s*$/);
    if (!match || Number(match[2]) > 59) return [];
    const fractionMs = Number((match[3] ?? '').padEnd(3, '0') || '0');
    return [{
      startMs: Number(match[1]) * 60000 + Number(match[2]) * 1000 + fractionMs,
      text: match[4],
    }];
  });
  return createLyricDocument({
    ...input,
    source: input.source ?? 'lrc-import',
    lines: parsed.map((line, index) => ({
      id: `${input.id}-line-${index + 1}`,
      order: index,
      startMs: line.startMs,
      endMs: null,
      text: line.text,
    })),
  });
}

/** Serialize a document as standard minute:second.centisecond LRC lines. */
export function lyricDocumentToLrc(document: LyricDocument): string {
  return [...document.lines]
    .sort((a, b) => a.order - b.order)
    .map((line) => {
      const totalCentiseconds = Math.max(0, Math.floor(line.startMs / 10));
      const minutes = Math.floor(totalCentiseconds / 6000);
      const seconds = Math.floor((totalCentiseconds % 6000) / 100);
      const centiseconds = totalCentiseconds % 100;
      const timestamp = `[${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}]`;
      return `${timestamp}${line.text}`;
    })
    .join('\n');
}

/** Validate a document before saving/review. Duration mismatch is a warning, not a hard failure. */
export function validateLyricDocument(
  document: LyricDocument,
  durationMs?: number | null,
): LyricDocumentIssue[] {
  const issues: LyricDocumentIssue[] = [];
  if (!document.title.trim()) issues.push({ code: 'empty-title', message: 'Add a title for this lyric document.', severity: 'error' });
  if (!document.audio.name.trim()) issues.push({ code: 'empty-audio-name', message: 'Associate the lyrics with an audio recording name.', severity: 'error' });
  if (document.lines.length === 0) issues.push({ code: 'empty-lyrics', message: 'Add at least one timestamped lyric line.', severity: 'error' });
  if (document.reviewStatus === 'reviewed' && !document.reviewedAt) {
    issues.push({ code: 'invalid-review-metadata', message: 'Reviewed documents must include reviewedAt.', severity: 'error' });
  }

  let previousStart = -1;
  const seenTimes = new Set<number>();
  document.lines.forEach((line, index) => {
    if (!Number.isFinite(line.startMs) || line.startMs < 0) {
      issues.push({ code: 'invalid-timestamp', message: 'Timestamp must be a finite non-negative value.', index, severity: 'error' });
    }
    if (line.startMs < previousStart) {
      issues.push({ code: 'out-of-order', message: 'Lines are not in chronological timestamp order.', index, severity: 'error' });
    }
    if (seenTimes.has(line.startMs)) {
      issues.push({ code: 'duplicate-timestamp', message: 'Two lyric lines share the same timestamp; review their order.', index, severity: 'warning' });
    }
    seenTimes.add(line.startMs);
    if (!line.text.trim()) issues.push({ code: 'blank-line', message: 'Lyric text cannot be blank.', index, severity: 'error' });
    if (line.endMs != null && (!Number.isFinite(line.endMs) || line.endMs <= line.startMs)) {
      issues.push({ code: 'invalid-end', message: 'End timestamp must be later than start timestamp.', index, severity: 'error' });
    }
    if (durationMs != null && Number.isFinite(durationMs) && durationMs > 0 && line.startMs > durationMs) {
      issues.push({ code: 'duration-mismatch', message: 'This lyric timestamp is beyond the audio duration.', index, severity: 'warning' });
    }
    previousStart = line.startMs;
  });
  return issues;
}

export function hasLyricDocumentErrors(issues: readonly LyricDocumentIssue[]): boolean {
  return issues.some((issue) => issue.severity === 'error');
}
