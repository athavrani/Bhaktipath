import { handleNaturalSegmentCompletion, RepetitionSession, validateTargetRepetitions } from '../repetition';

const initial: RepetitionSession = {
  sessionId: 'session-1',
  targetRepetitions: 2,
  completedRepetitions: 0,
  status: 'in_progress',
  currentLoopToken: 'loop-1',
  lastHandledLoopToken: null,
};

describe('repetition completion', () => {
  it('counts a natural completion once', () => {
    const first = handleNaturalSegmentCompletion(initial, 'loop-1');
    expect(first.counted).toBe(true);
    expect(first.session.completedRepetitions).toBe(1);
    const duplicate = handleNaturalSegmentCompletion(first.session, 'loop-1');
    expect(duplicate.counted).toBe(false);
    expect(duplicate.session.completedRepetitions).toBe(1);
  });

  it('stops when target is reached', () => {
    const one = handleNaturalSegmentCompletion(initial, 'loop-1');
    const readyForSecond = { ...one.session, currentLoopToken: 'loop-2' };
    const two = handleNaturalSegmentCompletion(readyForSecond, 'loop-2');
    expect(two.session.status).toBe('completed');
    expect(two.session.completedRepetitions).toBe(2);
    expect(two.shouldStopPlayback).toBe(true);
  });

  it('rejects wrong loop tokens and invalid targets', () => {
    expect(handleNaturalSegmentCompletion(initial, 'stale-loop').counted).toBe(false);
    expect(validateTargetRepetitions(0)).toBe(false);
    expect(validateTargetRepetitions(11)).toBe(true);
    expect(validateTargetRepetitions(1.5)).toBe(false);
  });
});