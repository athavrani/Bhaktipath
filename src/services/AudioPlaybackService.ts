export interface PlaybackMetadata {
  title: string;
  artist?: string;
  artworkUri?: string;
}

export interface PlaybackSnapshot {
  positionMs: number;
  durationMs: number | null;
  isPlaying: boolean;
  isBuffering: boolean;
  playbackRate: number;
}

export type PlaybackEvent =
  | { type: 'progress'; positionMs: number; durationMs: number | null }
  | { type: 'natural-end'; loopToken: string }
  | { type: 'interruption'; reason: 'audio-focus-loss' | 'noisy-output' }
  | { type: 'error'; message: string };

/** Adapter contract. Implement with a reviewed native Android player and media session. */
export interface AudioPlaybackService {
  setup(): Promise<void>;
  load(uri: string, metadata: PlaybackMetadata): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  seekTo(positionMs: number): Promise<void>;
  setRate(rate: number): Promise<void>;
  getSnapshot(): Promise<PlaybackSnapshot>;
  subscribe(listener: (event: PlaybackEvent) => void): () => void;
}