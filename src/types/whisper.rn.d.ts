/**
 * Minimal type shim for whisper.rn@0.7.4.
 *
 * The package is a React Native native-module package whose TypeScript
 * declarations are not being resolved by the project's Expo/TypeScript
 * configuration in CI. Keep this declaration intentionally narrow and aligned
 * with the public API used by WhisperRnRuntime. The concrete package remains a
 * runtime dependency in package.json; this file does not mock or replace it.
 */
declare module 'whisper.rn' {
  export interface WhisperInitOptions {
    filePath: string | number;
    useGpu?: boolean;
    useCoreMLIos?: boolean;
    useFlashAttn?: boolean;
    isBundleAsset?: boolean;
  }

  export interface WhisperNativeSegment {
    text: string;
    t0: number;
    t1: number;
    [key: string]: unknown;
  }

  export interface WhisperNativeTranscriptionResult {
    result: string;
    segments: WhisperNativeSegment[];
    isAborted: boolean;
  }

  export interface WhisperNativeTranscriptionTask {
    stop(): Promise<void>;
    promise: Promise<WhisperNativeTranscriptionResult>;
  }

  export interface WhisperNativeContext {
    transcribe(
      filePath: string | number,
      options?: {
        language?: string;
        onProgress?: (progress: number) => void;
        [key: string]: unknown;
      },
    ): WhisperNativeTranscriptionTask;
    release(): Promise<void>;
  }

  export function initWhisper(options: WhisperInitOptions): Promise<WhisperNativeContext>;
}
