import {
  createLyricDocument,
  hasLyricDocumentErrors,
  lyricDocumentFromLrc,
  lyricDocumentToLrc,
  validateLyricDocument,
} from '../lyricDocuments';

describe('lyric document model', () => {
  it('creates a versioned draft with stable metadata', () => {
    const document = createLyricDocument({
      id: 'prayer-1',
      title: '  Hanuman Chalisa  ',
      language: 'hi',
      audio: { name: 'chalisa.mp3' },
      now: '2026-10-27T10:00:00.000Z',
    });
    expect(document.schemaVersion).toBe(1);
    expect(document.title).toBe('Hanuman Chalisa');
    expect(document.reviewStatus).toBe('draft');
    expect(document.createdAt).toBe('2026-10-27T10:00:00.000Z');
    expect(document.updatedAt).toBe(document.createdAt);
  });

  it('imports Unicode LRC lines and exports them in timestamp order', () => {
    const document = lyricDocumentFromLrc({
      id: 'gujarati-aarti',
      title: 'જય અંબે',
      language: 'gu',
      audio: { name: 'aarti.mp3' },
      now: '2026-10-27T10:00:00.000Z',
    }, '[00:05.25]જય અંબે ગૌરી\n[00:01.50]જય મંગલ મૂર્તિ');
    expect(document.lines.map((line) => line.text)).toEqual(['જય મંગલ મૂર્તિ', 'જય અંબે ગૌરી']);
    expect(document.lines.map((line) => line.startMs)).toEqual([1500, 5250]);
    expect(lyricDocumentToLrc(document)).toBe('[00:01.50]જય મંગલ મૂર્તિ\n[00:05.25]જય અંબે ગૌરી');
  });

  it('reports empty lyrics and blank titles as errors', () => {
    const document = createLyricDocument({
      id: 'empty',
      title: ' ',
      language: 'sa',
      audio: { name: 'mantra.mp3' },
      lines: [],
    });
    const issues = validateLyricDocument(document);
    expect(issues.map((issue) => issue.code)).toContain('empty-title');
    expect(issues.map((issue) => issue.code)).toContain('empty-lyrics');
    expect(hasLyricDocumentErrors(issues)).toBe(true);
  });

  it('detects out-of-order and duplicate timestamps without discarding the text', () => {
    const document = createLyricDocument({
      id: 'bad-order',
      title: 'Test mantra',
      language: 'sa',
      audio: { name: 'mantra.mp3' },
      lines: [
        { id: 'a', order: 0, startMs: 2000, endMs: null, text: 'ॐ नमः शिवाय' },
        { id: 'b', order: 1, startMs: 1000, endMs: null, text: 'हर हर महादेव' },
        { id: 'c', order: 2, startMs: 1000, endMs: null, text: 'शिव शम्भो' },
      ],
    });
    const issues = validateLyricDocument(document);
    expect(issues.map((issue) => issue.code)).toContain('out-of-order');
    expect(issues.map((issue) => issue.code)).toContain('duplicate-timestamp');
  });

  it('warns when a lyric starts beyond the audio duration', () => {
    const document = lyricDocumentFromLrc({
      id: 'duration',
      title: 'Short prayer',
      language: 'en',
      audio: { name: 'short.mp3' },
    }, '[00:12.00]Too late');
    const issues = validateLyricDocument(document, 10000);
    expect(issues.some((issue) => issue.code === 'duration-mismatch' && issue.severity === 'warning')).toBe(true);
    expect(hasLyricDocumentErrors(issues)).toBe(false);
  });

  it('requires review metadata when marked reviewed', () => {
    const document = createLyricDocument({
      id: 'reviewed',
      title: 'Prayer',
      language: 'hi',
      audio: { name: 'prayer.mp3' },
      lines: [{ id: 'a', order: 0, startMs: 0, endMs: null, text: 'राम' }],
    });
    document.reviewStatus = 'reviewed';
    expect(validateLyricDocument(document).map((issue) => issue.code)).toContain('invalid-review-metadata');
  });
});
