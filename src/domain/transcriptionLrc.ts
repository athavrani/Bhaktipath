import type { TranscriptionDraft } from '../services/LyricsGenerationService';

/** Convert timed transcript segments to editable LRC text without persisting anything. */
export function transcriptionDraftToLrc(draft: TranscriptionDraft): string {
  return [...draft.segments]
    .filter((segment) => segment.text.trim().length > 0 && Number.isFinite(segment.startMs) && segment.startMs >= 0)
    .sort((a, b) => a.startMs - b.startMs)
    .map((segment) => {
      const centisecondsTotal = Math.floor(segment.startMs / 10);
      const minutes = Math.floor(centisecondsTotal / 6000);
      const seconds = Math.floor((centisecondsTotal % 6000) / 100);
      const centiseconds = centisecondsTotal % 100;
      return `[${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}]${segment.text.trim()}`;
    })
    .join('\n');
}
