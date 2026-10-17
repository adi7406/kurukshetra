/**
 * Client-Side Integrity Signal Derivation
 * Derives the 4 required review signals from a complete replayable timeline:
 * 1. large_pastes: Large pastes (>60 characters in one event)
 * 2. fast_typing_rhythm: Code appearing faster than natural student typing rhythm (>14 chars/sec)
 * 3. no_write_run_fix_cycle: Solution submitted with 0 test runs or no iterative fix cycles
 * 4. no_corrections_uniform_typing: Code typed evenly across 80+ chars with zero backspace/deletions
 */

export function deriveTimelineIntegritySignals(events = [], sessionSummary = {}) {
  const signals = [];

  if (!Array.isArray(events) || events.length === 0) {
    return signals;
  }

  // 1. Large Pastes Detector
  events.forEach((ev) => {
    let pasteLen = 0;
    if (ev.eventType === 'paste' || ev.event_type === 'paste') {
      pasteLen = ev.payload?.charLength || ev.payload?.text?.length || ev.payload?.length || ev.payload?.delta || 0;
    } else if (
      (ev.eventType === 'document_change' || ev.event_type === 'document_change') &&
      (ev.payload?.delta >= 60 || (ev.payload?.inserted?.length || 0) >= 60)
    ) {
      pasteLen = ev.payload?.delta || ev.payload?.inserted?.length || 0;
    }

    if (pasteLen >= 60) {
      signals.push({
        id: `sig_paste_${ev.sequenceNumber || Math.random()}`,
        signalType: 'large_pastes',
        title: 'Large Code Paste Detected',
        confidenceScore: 0.92,
        time: ev.time || 0,
        occurredAt: ev.occurredAt || new Date().toISOString(),
        severity: 'high',
        description: `Large paste of ${pasteLen} characters inserted in a single operation.`,
        evidence: {
          length: pasteLen,
          eventType: ev.eventType || ev.event_type,
          sequence: ev.sequenceNumber,
        },
      });
    }
  });

  // 2. Code Appearing Faster Than Typing Rhythm
  let burstCount = 0;
  for (let i = 0; i < events.length - 1; i++) {
    const cur = events[i];
    const nxt = events[i + 1];
    const curType = cur.eventType || cur.event_type;
    const nxtType = nxt.eventType || nxt.event_type;

    if (
      (curType === 'keystroke' || curType === 'document_change') &&
      (nxtType === 'keystroke' || nxtType === 'document_change')
    ) {
      const curMs = new Date(cur.occurredAt || 0).getTime();
      const nxtMs = new Date(nxt.occurredAt || 0).getTime();
      const msDiff = nxtMs - curMs;
      const charDiff = Math.abs(nxt.payload?.charCount || nxt.payload?.delta || 1);

      // If typing speed exceeds ~14 chars per second (>3 chars within 100ms)
      if (msDiff > 0 && msDiff < 100 && charDiff >= 3) {
        burstCount++;
      }
    }
  }

  if (burstCount >= 2) {
    signals.push({
      id: `sig_rhythm_${Date.now()}`,
      signalType: 'fast_typing_rhythm',
      title: 'Code Appearing Faster Than Typing Rhythm',
      confidenceScore: 0.88,
      time: events[0]?.time || 15,
      occurredAt: events[0]?.occurredAt || new Date().toISOString(),
      severity: 'medium',
      description: `Code appeared at rate significantly exceeding normal human typing rhythm (>14 chars/sec bursts).`,
      evidence: {
        burstCount,
        threshold: '14 chars/sec',
      },
    });
  }

  // 3. No Write-Run-Fix Cycle
  const runEvents = events.filter((e) => (e.eventType || e.event_type) === 'run');
  const submitEvents = events.filter((e) => (e.eventType || e.event_type) === 'submit');

  if (submitEvents.length > 0 && runEvents.length === 0) {
    const sub = submitEvents[0];
    signals.push({
      id: 'sig_no_cycle',
      signalType: 'no_write_run_fix_cycle',
      title: 'No Write-Run-Fix Cycle',
      confidenceScore: 0.85,
      time: sub.time || 60,
      occurredAt: sub.occurredAt || new Date().toISOString(),
      severity: 'medium',
      description: 'Absence of iterative write-run-fix engineering cycle: solution submitted without running local test suites.',
      evidence: {
        runCount: 0,
        submitCount: submitEvents.length,
      },
    });
  }

  // 4. Code Typed Evenly With No Corrections
  const deletionEvents = events.filter(
    (e) =>
      (e.eventType || e.event_type) === 'deletion' ||
      ((e.eventType || e.event_type) === 'document_change' && (e.payload?.delta < 0 || e.payload?.action === 'delete'))
  );

  const totalTyped = events.reduce((sum, e) => {
    const type = e.eventType || e.event_type;
    if (type === 'keystroke' || type === 'document_change') {
      const delta = e.payload?.charCount || e.payload?.delta || 0;
      return delta > 0 ? sum + delta : sum;
    }
    return sum;
  }, 0);

  if (totalTyped >= 80 && deletionEvents.length === 0) {
    signals.push({
      id: 'sig_no_corrections',
      signalType: 'no_corrections_uniform_typing',
      title: 'Code Typed Evenly With No Corrections',
      confidenceScore: 0.82,
      time: events[events.length - 1]?.time || 45,
      occurredAt: events[events.length - 1]?.occurredAt || new Date().toISOString(),
      severity: 'low',
      description: 'Code was entered with uniform cadence and zero backspace corrections across 80+ characters.',
      evidence: {
        totalCharsTyped: totalTyped,
        deletionCount: 0,
      },
    });
  }

  return signals;
}
