import {
  validateTranscriptionRequest,
  type LyricsGenerationService,
  type TranscriptionDraft,
  type TranscriptionLanguage,
  type TranscriptionProgress,
  type TranscriptionRequest,
  type TranscriptionSegment,
} from './LyricsGenerationService';

export interface WhisperRuntimeSegment {
  text: string;
  startMs: number;
  endMs: number | null;
  confidence?: number;
}

export interface WhisperRuntimeResult {
  text: string;
  segments?: readonly WhisperRuntimeSegment[];
  aborted?: boolean;
}

export interface WhisperRuntimeSession {
  transcribe(
    audioUri: string,
    languageCode: string,
    onProgress?: (fraction: number) => void,
  ): Promise<WhisperRuntimeResult>;
  stop(): Promise<void>;
  release(): Promise<void>;
}

export interface WhisperRuntimePort {
  /** The supplied model path must already be downloaded and checksum-verified. */
  open(modelPath: string): Promise<WhisperRuntimeSession>;
}

export class TranscriptionCancelledError extends Error {
  constructor() {
    super('Lyrics transcription was cancelled.');
    this.name = 'TranscriptionCancelledError';
  }
}

const LANGUAGE_CODES: Record<TranscriptionLanguage, string> = {
  'gu-IN': 'gu',
  'hi-IN': 'hi',
  'sa-IN': 'sa',
  'en-US': 'en',
};

/**
 * On-device-only adapter. The runtime port is injected so unit tests do not load native JSI.
 * It returns an unreviewed draft; it never persists content or uses a network fallback.
 */
export class WhisperOnDeviceService implements LyricsGenerationService {
  readonly capabilities = {
    id: 'whisper-cpp-on-device',
    displayName: 'Whisper (on this device)',
    mode: 'on-device' as const,
    supportedLanguages: ['gu-IN', 'hi-IN', 'sa-IN', 'en-US'] as const,
    supportsWordTimestamps: false,
    supportsCancellation: true,
    requiresNetwork: false,
  };

  private readonly active = new Map<string, WhisperRuntimeSession>();
  private readonly cancelled = new Set<string>();

  constructor(
    private readonly runtime: WhisperRuntimePort,
    private readonly getVerifiedModelPath: () => Promise<string | null>,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async transcribe(
    request: TranscriptionRequest,
    onProgress?: (progress: TranscriptionProgress) => void,
  ): Promise<TranscriptionDraft> {
    // Reject cloud mode before generic request validation so this local-only service
    // never implies that adding cloud consent could make it upload audio.
    if (request.mode !== 'on-device') {
      throw new Error('WhisperOnDeviceService only accepts on-device requests.');
    }
    const issues = validateTranscriptionRequest(request);
    if (issues.length) throw new Error(issues.map((issue) => issue.message).join(' '));
    if (this.active.has(request.requestId)) {
      throw new Error('A transcription with this request ID is already running.');
    }

    const modelPath = await this.getVerifiedModelPath();
    if (!modelPath) throw new Error('Download and verify a multilingual Whisper model first.');

    onProgress?.({ requestId: request.requestId, phase: 'preparing', message: 'Loading local model.' });
    const session = await this.runtime.open(modelPath);
    if (this.cancelled.has(request.requestId)) {
      this.cancelled.delete(request.requestId);
      await session.release();
      throw new TranscriptionCancelledError();
    }
    this.active.set(request.requestId, session);
    try {
      onProgress?.({ requestId: request.requestId, phase: 'transcribing', message: 'Processing audio locally.' });
      const result = await session.transcribe(request.audioUri, LANGUAGE_CODES[request.language], (fraction) => {
        onProgress?.({
          requestId: request.requestId,
          phase: 'transcribing',
          fraction: Number.isFinite(fraction) ? Math.max(0, Math.min(1, fraction)) : undefined,
        });
      });
      if (result.aborted) throw new TranscriptionCancelledError();

      const segments: TranscriptionSegment[] = (result.segments ?? [])
        .filter((segment) => segment.text.trim().length > 0)
        .map((segment) => ({
          text: segment.text.trim(),
          startMs: Math.max(0, segment.startMs),
          endMs: segment.endMs != null && segment.endMs > segment.startMs ? segment.endMs : null,
          ...(segment.confidence != null && Number.isFinite(segment.confidence)
            ? { confidence: Math.max(0, Math.min(1, segment.confidence)) }
            : {}),
        }))
        .sort((a, b) => a.startMs - b.startMs);

      if (segments.length === 0 && result.text.trim()) {
        // Keep transcript text visible for review even when the engine cannot return timestamps.
        segments.push({ text: result.text.trim(), startMs: 0, endMs: null });
      }

      return {
        requestId: request.requestId,
        providerId: this.capabilities.id,
        mode: 'on-device',
        language: request.language,
        segments,
        warnings: [
          'Automatically generated lyrics may be inaccurate, especially for singing, music, mantras, and Sanskrit.',
          'Review and correct all text and timestamps before saving.',
          ...(segments.some((segment) => segment.endMs === null)
            ? ['Some segments do not have a validated end timestamp.']
            : []),
        ],
        generatedAt: this.now(),
      };
    } finally {
      this.active.delete(request.requestId);
      this.cancelled.delete(request.requestId);
      await session.release();
    }
  }

  async cancel(requestId: string): Promise<void> {
    this.cancelled.add(requestId);
    const session = this.active.get(requestId);
    if (session) await session.stop();
  }
}
