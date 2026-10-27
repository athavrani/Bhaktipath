import { findActiveTimestampedLyric, parseTimestampedLyrics } from '../lrc';

describe('parseTimestampedLyrics', () => {
  it('parses and sorts timestamped lines', () => {
    expect(parseTimestampedLyrics('[00:05.00]Second\n[00:01.50]First')).toEqual([
      { time: 1.5, text: 'First' },
      { time: 5, text: 'Second' },
    ]);
  });

  it('ignores malformed lines and metadata', () => {
    expect(parseTimestampedLyrics('[ti:Prayer]\nnot a lyric\n[00:75.00]Bad')).toEqual([]);
  });
});

describe('findActiveTimestampedLyric', () => {
  const lines = parseTimestampedLyrics('[00:01.00]First\n[00:04.00]Second');
  it('returns no line before the first timestamp', () => {
    expect(findActiveTimestampedLyric(lines, 0.5)).toBeNull();
  });
  it('returns the latest line at or before playback position', () => {
    expect(findActiveTimestampedLyric(lines, 4)).toBe('Second');
  });
});