import { initWhisper } from 'whisper.rn';
import type {
  WhisperRuntimePort,
  WhisperRuntimeResult,
  WhisperRuntimeSegment,
  WhisperRuntimeSession,
} from './WhisperOnDeviceService';

/**
 * The narrow runtime surface used by this adapter. Keeping the native package
 * behind this seam lets Jest test mapping/cancellation without loading JSI.
 * whisper.rn reports segment t0/t1 in seconds, unlike BhaktiPath's millisecond
 * domain model.
 */
interface NativeWhisperSegment {
  text?: string;
  t0?: number;
  t1?: number;
}

interface NativeWhisperResult {
  result?: string;
  segments?: NativeWhisperSegment[];
  isAborted?: boolean;
}

interface NativeTranscriptionTask {
  stop(): Promise<void>;
  promise: Promise<NativeWhisperResult>;
}

interface NativeWhisperContext {
  transcribe(
    audioPath: string,
    options: { language: string; onProgress?: (progress: number) => void },
  ): NativeTranscriptionTask;
  release(): Promise<void>;
}

type WhisperContextFactory = (modelPath: string) => Promise<NativeWhisperContext>;

function asFileUri(path: string): string {
  if (/^(file|content):\/\//i.test(path)) return path;
  if (path.startsWith('/')) return `file://${path}`;
  return path;
}

function mapNativeResult(result: NativeWhisperResult): WhisperRuntimeResult {
  const segments: WhisperRuntimeSegment[] = (result.segments ?? [])
    .filter((segment) => typeof segment.text === 'string' && segment.text.trim().length > 0)
    .map((segment) => ({
      text: segment.text!.trim(),
      startMs: Math.max(0, Math.round((Number.isFinite(segment.t0) ? segment.t0! : 0) * 1000)),
      endMs:
        Number.isFinite(segment.t1) && segment.t1! > (Number.isFinite(segment.t0) ? segment.t0! : 0)
          ? Math.round(segment.t1! * 1000)
          : null,
    }))
    .sort((a, b) => a.startMs - b.startMs);

  return {
    text: typeof result.result === 'string' ? result.result : '',
    segments,
    aborted: result.isAborted === true,
  };
}

/**
 * Concrete whisper.rn bridge for Android/Expo prebuild builds.
 * The caller is responsible for passing a previously downloaded and verified
 * multilingual model and a locally accessible audio file.
 */
export class WhisperRnRuntime implements WhisperRuntimePort {
  constructor(
    private readonly initialize: WhisperContextFactory = async (modelPath) =>
      (await initWhisper({ filePath: asFileUri(modelPath) })) as unknown as NativeWhisperContext,
  ) {}

  async open(modelPath: string): Promise<WhisperRuntimeSession> {
    if (!modelPath.trim()) throw new Error('A verified Whisper model path is required.');

    const context = await this.initialize(modelPath);
    let released = false;
    let activeTask: NativeTranscriptionTask | null = null;

    return {
      transcribe: async (audioUri, languageCode, onProgress) => {
        if (released) throw new Error('Whisper context has already been released.');
        const task = context.transcribe(asFileUri(audioUri), {
          language: languageCode,
          onProgress: (fraction) => {
            if (Number.isFinite(fraction)) onProgress?.(Math.max(0, Math.min(1, fraction / 100)));
          },
        });
        activeTask = task;
        try {
          return mapNativeResult(await task.promise);
        } finally {
          if (activeTask === task) activeTask = null;
        }
      },
      stop: async () => {
        if (activeTask) await activeTask.stop();
      },
      release: async () => {
        if (released) return;
        released = true;
        if (activeTask) {
          try {
            await activeTask.stop();
          } finally {
            activeTask = null;
          }
        }
        await context.release();
      },
    };
  }
}

export { mapNativeResult as mapWhisperRnResultForTesting };
