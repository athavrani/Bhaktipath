import { transcriptionDraftToLrc } from '../transcriptionLrc';

describe('transcriptionDraftToLrc', () => {
  it('sorts segments and formats millisecond timestamps as LRC centiseconds', () => {
    expect(transcriptionDraftToLrc({
      requestId: 'r1',
      providerId: 'whisper-cpp-on-device',
      mode: 'on-device',
      language: 'gu-IN',
      segments: [
        { text: 'બીજી પંક્તિ', startMs: 6543, endMs: 9000 },
        { text: 'પ્રથમ પંક્તિ', startMs: 1250, endMs: 6000 },
      ],
      warnings: [],
      generatedAt: '2026-10-28T00:00:00.000Z',
    })).toBe('[00:01.25]પ્રથમ પંક્તિ\n[00:06.54]બીજી પંક્તિ');
  });

  it('ignores blank text and invalid timestamps', () => {
    expect(transcriptionDraftToLrc({
      requestId: 'r2',
      providerId: 'whisper-cpp-on-device',
      mode: 'on-device',
      language: 'hi-IN',
      segments: [
        { text: '   ', startMs: 0, endMs: null },
        { text: 'bad', startMs: Number.NaN, endMs: null },
      ],
      warnings: [],
      generatedAt: '2026-10-28T00:00:00.000Z',
    })).toBe('');
  });
});
