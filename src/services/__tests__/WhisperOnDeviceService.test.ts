import { WhisperOnDeviceService, type WhisperRuntimePort } from '../WhisperOnDeviceService';

const request = {
  requestId: 'r1',
  audioUri: 'file:///devotional.wav',
  language: 'gu-IN' as const,
  mode: 'on-device' as const,
};

describe('WhisperOnDeviceService', () => {
  const makeRuntime = (result = {
    text: 'જય શ્રી કૃષ્ણ',
    segments: [{ text: 'જય શ્રી કૃષ્ણ', startMs: 120, endMs: 800, confidence: 0.8 }],
  }) => {
    const session = {
      transcribe: jest.fn(async (_uri: string, _language: string, progress?: (fraction: number) => void) => {
        progress?.(0.5);
        return result;
      }),
      stop: jest.fn(async () => undefined),
      release: jest.fn(async () => undefined),
    };
    const runtime: WhisperRuntimePort = { open: jest.fn(async () => session) };
    return { runtime, session };
  };

  it('uses the verified local model and maps timestamped segments into a reviewable draft', async () => {
    const { runtime, session } = makeRuntime();
    const service = new WhisperOnDeviceService(runtime, async () => '/models/multilingual.bin', () => '2026-10-28T00:00:00.000Z');
    const progress: Array<{ phase: string; fraction?: number }> = [];

    const draft = await service.transcribe(request, (event) => progress.push(event));

    expect(runtime.open).toHaveBeenCalledWith('/models/multilingual.bin');
    expect(session.transcribe).toHaveBeenCalledWith('file:///devotional.wav', 'gu', expect.any(Function));
    expect(draft.segments).toEqual([{ text: 'જય શ્રી કૃષ્ણ', startMs: 120, endMs: 800, confidence: 0.8 }]);
    expect(draft.warnings.length).toBeGreaterThan(0);
    expect(draft.generatedAt).toBe('2026-10-28T00:00:00.000Z');
    expect(session.release).toHaveBeenCalledTimes(1);
    expect(progress.some((event) => event.fraction === 0.5)).toBe(true);
  });

  it('refuses to run until a verified model is available', async () => {
    const { runtime } = makeRuntime();
    const service = new WhisperOnDeviceService(runtime, async () => null);
    await expect(service.transcribe(request)).rejects.toThrow('Download and verify');
    expect(runtime.open).not.toHaveBeenCalled();
  });

  it('never accepts cloud mode', async () => {
    const { runtime } = makeRuntime();
    const service = new WhisperOnDeviceService(runtime, async () => '/models/model.bin');
    await expect(service.transcribe({ ...request, mode: 'cloud' })).rejects.toThrow('only accepts on-device');
    expect(runtime.open).not.toHaveBeenCalled();
  });

  it('releases native resources even when transcription fails', async () => {
    const { runtime, session } = makeRuntime();
    session.transcribe.mockRejectedValueOnce(new Error('native failure'));
    const service = new WhisperOnDeviceService(runtime, async () => '/models/model.bin');
    await expect(service.transcribe(request)).rejects.toThrow('native failure');
    expect(session.release).toHaveBeenCalledTimes(1);
  });
});
