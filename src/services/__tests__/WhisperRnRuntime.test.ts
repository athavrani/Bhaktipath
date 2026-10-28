jest.mock('whisper.rn', () => ({
  initWhisper: jest.fn(),
}));

import { initWhisper } from 'whisper.rn';
import {
  WhisperRnRuntime,
  mapWhisperRnResultForTesting,
} from '../WhisperRnRuntime';

const mockedInitWhisper = initWhisper as jest.MockedFunction<typeof initWhisper>;

describe('WhisperRnRuntime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes a context with a file URI and maps native seconds to milliseconds', async () => {
    const context = {
      transcribe: jest.fn(() => ({
        stop: jest.fn(async () => undefined),
        promise: Promise.resolve({
          result: 'જય શ્રી કૃષ્ણ',
          segments: [
            { text: 'બીજી પંક્તિ', t0: 1.25, t1: 2.1 },
            { text: 'જય શ્રી કૃષ્ણ', t0: 0.1, t1: 0.9 },
          ],
        }),
      })),
      release: jest.fn(async () => undefined),
    };
    mockedInitWhisper.mockResolvedValue(context as never);

    const runtime = new WhisperRnRuntime();
    const session = await runtime.open('/models/ggml-tiny.bin');
    const result = await session.transcribe('/audio/devotional.wav', 'gu');

    expect(mockedInitWhisper).toHaveBeenCalledWith({ filePath: 'file:///models/ggml-tiny.bin' });
    expect(context.transcribe).toHaveBeenCalledWith(
      'file:///audio/devotional.wav',
      expect.objectContaining({ language: 'gu', onProgress: expect.any(Function) }),
    );
    expect(result.segments).toEqual([
      { text: 'જય શ્રી કૃષ્ણ', startMs: 100, endMs: 900 },
      { text: 'બીજી પંક્તિ', startMs: 1250, endMs: 2100 },
    ]);
    await session.release();
    expect(context.release).toHaveBeenCalledTimes(1);
  });

  it('normalizes progress from percentage to a fraction and clamps it', async () => {
    let nativeOptions: { onProgress?: (value: number) => void } | undefined;
    const context = {
      transcribe: jest.fn((_path: string, options: { onProgress?: (value: number) => void }) => {
        nativeOptions = options;
        return {
          stop: jest.fn(async () => undefined),
          promise: Promise.resolve({ result: '', segments: [] }),
        };
      }),
      release: jest.fn(async () => undefined),
    };
    mockedInitWhisper.mockResolvedValue(context as never);
    const session = await new WhisperRnRuntime().open('file:///models/model.bin');
    const progress: number[] = [];
    await session.transcribe('content://audio/1', 'hi', (fraction) => progress.push(fraction));
    nativeOptions?.onProgress?.(50);
    nativeOptions?.onProgress?.(150);
    expect(progress).toEqual([0.5, 1]);
    expect(context.transcribe).toHaveBeenCalledWith('content://audio/1', expect.any(Object));
    await session.release();
  });

  it('stops an active native task on cancellation and releases the context once', async () => {
    let resolvePromise!: (value: { result: string; segments: [] }) => void;
    const stop = jest.fn(async () => undefined);
    const context = {
      transcribe: jest.fn(() => ({
        stop,
        promise: new Promise<{ result: string; segments: [] }>((resolve) => {
          resolvePromise = resolve;
        }),
      })),
      release: jest.fn(async () => undefined),
    };
    mockedInitWhisper.mockResolvedValue(context as never);
    const session = await new WhisperRnRuntime().open('model.bin');
    const transcribing = session.transcribe('audio.wav', 'sa');
    await session.stop();
    expect(stop).toHaveBeenCalledTimes(1);
    resolvePromise({ result: 'mantra', segments: [] });
    await transcribing;
    await session.release();
    await session.release();
    expect(context.release).toHaveBeenCalledTimes(1);
  });

  it('maps an aborted result and tolerates missing timestamps', () => {
    expect(mapWhisperRnResultForTesting({
      result: 'partial',
      isAborted: true,
      segments: [{ text: 'partial' }],
    })).toEqual({
      text: 'partial',
      segments: [{ text: 'partial', startMs: 0, endMs: null }],
      aborted: true,
    });
  });

  it('rejects a blank model path before native initialization', async () => {
    const runtime = new WhisperRnRuntime();
    await expect(runtime.open('  ')).rejects.toThrow('model path');
    expect(mockedInitWhisper).not.toHaveBeenCalled();
  });
});
