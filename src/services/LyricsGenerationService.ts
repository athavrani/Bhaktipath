/**
 * Provider-neutral contract for Phase 4/5 lyric transcription.
 *
 * This file intentionally contains no network client, credentials, or model runtime.
 * A provider must declare capabilities and return draft content for user review.
 */
export type TranscriptionLanguage = 'gu-IN' | 'hi-IN' | 'sa-IN' | 'en-US';
export type TranscriptionMode = 'on-device' | 'cloud';

export interface CloudUploadConsent {
  /** ISO-8601 timestamp captured after the user explicitly accepts the upload disclosure. */
  acceptedAt: string;
  purpose: 'devotional-lyrics-transcription';
}

export interface TranscriptionRequest {
  requestId: string;
  audioUri: string;
  language: TranscriptionLanguage;
  /** The mode is explicit; callers must not silently fall back from local to cloud. */
  mode: TranscriptionMode;
  /** Required for cloud mode and must only be populated after an affirmative user action. */
  cloudConsent?: CloudUploadConsent;
}

export interface TranscriptionCapabilities {
  id: string;
  displayName: string;
  mode: TranscriptionMode;
  supportedLanguages: readonly TranscriptionLanguage[];
  supportsWordTimestamps: boolean;
  supportsCancellation: boolean;
  requiresNetwork: boolean;
  /** Approximate downloaded model size; omit for cloud providers or unknown sizes. */
  modelSizeMb?: number;
}

export interface TranscriptionProgress {
  requestId: string;
  phase: 'preparing' | 'uploading' | 'transcribing' | 'aligning' | 'finalizing';
  /** Optional progress from 0 to 1. Omit when the engine cannot report it honestly. */
  fraction?: number;
  message?: string;
}

export interface TranscriptionSegment {
  text: string;
  startMs: number;
  endMs: number | null;
  confidence?: number;
}

export interface TranscriptionDraft {
  requestId: string;
  providerId: string;
  mode: TranscriptionMode;
  language: TranscriptionLanguage;
  segments: TranscriptionSegment[];
  warnings: string[];
  generatedAt: string;
}

export type TranscriptionRequestIssueCode =
  | 'missing-request-id'
  | 'missing-audio-uri'
  | 'cloud-consent-required'
  | 'invalid-cloud-consent';

export interface TranscriptionRequestIssue {
  code: TranscriptionRequestIssueCode;
  message: string;
}

/** Shared request validation so every provider enforces the same privacy preconditions. */
export function validateTranscriptionRequest(
  request: TranscriptionRequest,
): TranscriptionRequestIssue[] {
  const issues: TranscriptionRequestIssue[] = [];

  if (!request.requestId.trim()) {
    issues.push({ code: 'missing-request-id', message: 'A request ID is required.' });
  }
  if (!request.audioUri.trim()) {
    issues.push({ code: 'missing-audio-uri', message: 'Select an audio recording first.' });
  }

  if (request.mode === 'cloud') {
    if (!request.cloudConsent) {
      issues.push({
        code: 'cloud-consent-required',
        message: 'Explicit consent is required before uploading audio for cloud transcription.',
      });
    } else if (
      request.cloudConsent.purpose !== 'devotional-lyrics-transcription' ||
      !Number.isFinite(Date.parse(request.cloudConsent.acceptedAt))
    ) {
      issues.push({
        code: 'invalid-cloud-consent',
        message: 'Cloud consent must include a valid acceptance timestamp and purpose.',
      });
    }
  }

  return issues;
}

/**
 * Engines must not persist generated lyrics automatically. The caller owns review and saving.
 * Implementations should report unsupported languages and cancellation as typed errors in Phase 5.
 */
export interface LyricsGenerationService {
  readonly capabilities: TranscriptionCapabilities;
  transcribe(
    request: TranscriptionRequest,
    onProgress?: (progress: TranscriptionProgress) => void,
  ): Promise<TranscriptionDraft>;
  cancel?(requestId: string): Promise<void>;
}
