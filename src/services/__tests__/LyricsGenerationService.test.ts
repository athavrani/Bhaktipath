import {
  validateTranscriptionRequest,
  type TranscriptionRequest,
} from '../LyricsGenerationService';

const baseRequest: TranscriptionRequest = {
  requestId: 'request-1',
  audioUri: 'file:///prayer.m4a',
  language: 'gu-IN',
  mode: 'on-device',
};

describe('validateTranscriptionRequest', () => {
  it('accepts a valid on-device request without cloud consent', () => {
    expect(validateTranscriptionRequest(baseRequest)).toEqual([]);
  });

  it('requires explicit consent for cloud processing', () => {
    expect(validateTranscriptionRequest({ ...baseRequest, mode: 'cloud' })).toEqual([
      {
        code: 'cloud-consent-required',
        message: 'Explicit consent is required before uploading audio for cloud transcription.',
      },
    ]);
  });

  it('accepts cloud mode only with purpose-bound, timestamped consent', () => {
    expect(validateTranscriptionRequest({
      ...baseRequest,
      mode: 'cloud',
      cloudConsent: {
        acceptedAt: '2026-10-28T10:00:00.000Z',
        purpose: 'devotional-lyrics-transcription',
      },
    })).toEqual([]);
  });

  it('rejects invalid consent metadata', () => {
    const issues = validateTranscriptionRequest({
      ...baseRequest,
      mode: 'cloud',
      cloudConsent: {
        acceptedAt: 'not-a-date',
        purpose: 'devotional-lyrics-transcription',
      },
    });
    expect(issues.map((issue) => issue.code)).toContain('invalid-cloud-consent');
  });

  it('reports missing request IDs and audio URIs', () => {
    const issues = validateTranscriptionRequest({
      ...baseRequest,
      requestId: ' ',
      audioUri: ' ',
    });
    expect(issues.map((issue) => issue.code)).toEqual([
      'missing-request-id',
      'missing-audio-uri',
    ]);
  });
});
