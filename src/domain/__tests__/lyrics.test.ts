import { findActiveLyricLine, validateLyricLines, LyricLine } from '../lyrics';

const lines: LyricLine[] = [
  { id: 'a', order: 0, startMs: 1000, endMs: null, text: 'પ્રથમ' },
  { id: 'b', order: 1, startMs: 2500, endMs: 4000, text: 'द्वितीय' },
  { id: 'c', order: 2, startMs: 4500, endMs: null, text: 'तृतीय' },
];

describe('findActiveLyricLine', () => {
  it('returns null before the first line', () => expect(findActiveLyricLine(lines, 999)).toBeNull());
  it('activates a line at its start time', () => expect(findActiveLyricLine(lines, 1000)?.id).toBe('a'));
  it('uses next line start as implicit end', () => expect(findActiveLyricLine(lines, 2499)?.id).toBe('a'));
  it('returns null in a gap after an explicit end', () => expect(findActiveLyricLine(lines, 4000)).toBeNull());
  it('activates the next line at its start', () => expect(findActiveLyricLine(lines, 4500)?.id).toBe('c'));
});

describe('validateLyricLines', () => {
  it('accepts valid timestamped lines', () => expect(validateLyricLines(lines)).toHaveLength(0));
  it('flags blank text and invalid end time', () => {
    const issues = validateLyricLines([{ id: 'x', order: 0, startMs: 100, endMs: 100, text: ' ' }]);
    expect(issues.length).toBe(2);
  });
});