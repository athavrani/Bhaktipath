export type SessionStatus = 'in_progress' | 'completed' | 'stopped' | 'interrupted';

export interface RepetitionSession {
  sessionId: string;
  targetRepetitions: number;
  completedRepetitions: number;
  status: SessionStatus;
  currentLoopToken: string;
  lastHandledLoopToken: string | null;
}

export type SegmentCompletionResult = {
  session: RepetitionSession;
  counted: boolean;
  shouldStopPlayback: boolean;
};

/**
 * Apply a natural end-of-segment event once per loop token.
 * The caller must not invoke this for a manual seek, stop, or player error.
 * Persist the returned session before starting the next loop.
 */
export function handleNaturalSegmentCompletion(
  session: RepetitionSession,
  eventLoopToken: string,
): SegmentCompletionResult {
  if (session.status !== 'in_progress') {
    return { session, counted: false, shouldStopPlayback: session.status === 'completed' };
  }
  if (eventLoopToken !== session.currentLoopToken || eventLoopToken === session.lastHandledLoopToken) {
    return { session, counted: false, shouldStopPlayback: false };
  }

  const completedRepetitions = Math.min(
    session.targetRepetitions,
    session.completedRepetitions + 1,
  );
  const isComplete = completedRepetitions >= session.targetRepetitions;
  const nextSession: RepetitionSession = {
    ...session,
    completedRepetitions,
    status: isComplete ? 'completed' : 'in_progress',
    lastHandledLoopToken: eventLoopToken,
    // The caller replaces this token with a new unique token before starting the next loop.
  };
  return { session: nextSession, counted: true, shouldStopPlayback: isComplete };
}

export function validateTargetRepetitions(target: number, maximum = 1080): boolean {
  return Number.isInteger(target) && target >= 1 && target <= maximum;
}