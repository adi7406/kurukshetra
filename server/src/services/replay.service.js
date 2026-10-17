import { getSupabase } from '../integrations/supabase.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors.js';

export const ALLOWED_EVENT_TYPES = [
  'document_change',
  'keystroke',
  'deletion',
  'paste',
  'run',
  'submit',
  'editor_focus',
  'editor_blur',
  'visibility_change',
  'tab_switch',
  'language_change',
  'snapshot',
];

export const MAX_EVENT_BATCH_SIZE = 100;
export const MAX_EVENT_PAYLOAD_BYTES = 256 * 1024; // 256 KB

export const replayService = {
  /**
   * Append a batch of editor events for replay and integrity review
   */
  async recordEvents({ sessionId, studentId, events = [], isFinal = false }) {
    if (!Array.isArray(events) || events.length === 0) {
      throw new ValidationError('Events array must contain at least one event.');
    }

    if (events.length > MAX_EVENT_BATCH_SIZE) {
      throw new ValidationError(
        `Batch size (${events.length} events) exceeds maximum allowed limit (${MAX_EVENT_BATCH_SIZE} events).`
      );
    }

    const payloadBytes = Buffer.byteLength(JSON.stringify(events), 'utf8');
    if (payloadBytes > MAX_EVENT_PAYLOAD_BYTES) {
      throw new ValidationError(
        `Batch payload size (${payloadBytes} bytes) exceeds maximum permitted limit (${MAX_EVENT_PAYLOAD_BYTES} bytes).`
      );
    }

    const supabase = getSupabase();

    // 1. Verify session exists and belongs to the authenticated student
    const { data: session } = await supabase
      .from('coding_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (!session) {
      throw new NotFoundError('Coding session not found.');
    }

    if (session.student_id !== studentId) {
      throw new ForbiddenError('You do not have permission to append events to this session.');
    }

    // 2. Validate event items
    const nowMs = Date.now();
    const rowsToInsert = [];
    let highestSequence = session.last_event_sequence || 0;

    for (const ev of events) {
      if (typeof ev.sequenceNumber !== 'number' || ev.sequenceNumber < 0) {
        throw new ValidationError('Each event must contain a non-negative sequenceNumber.');
      }

      if (!ev.eventType || !ALLOWED_EVENT_TYPES.includes(ev.eventType)) {
        throw new ValidationError(
          `Event type '${ev.eventType}' is invalid. Allowed: ${ALLOWED_EVENT_TYPES.join(', ')}`
        );
      }

      if (!ev.occurredAt) {
        throw new ValidationError('Each event must specify an occurredAt ISO timestamp.');
      }

      const evTimeMs = new Date(ev.occurredAt).getTime();
      if (isNaN(evTimeMs)) {
        throw new ValidationError('occurredAt must be a valid ISO date timestamp.');
      }

      // Check future timestamp drift (max 60 seconds tolerance)
      if (evTimeMs > nowMs + 60 * 1000) {
        throw new ValidationError('occurredAt timestamp cannot be in the future.');
      }

      if (ev.sequenceNumber > highestSequence) {
        highestSequence = ev.sequenceNumber;
      }

      rowsToInsert.push({
        session_id: sessionId,
        sequence_number: ev.sequenceNumber,
        event_type: ev.eventType,
        payload: ev.payload || {},
        client_event_id: ev.clientEventId || null,
        occurred_at: ev.occurredAt,
      });
    }

    // 3. Persist events
    await supabase.from('session_events').insert(rowsToInsert);

    // 4. Update session metadata with highest sequence and completion flag
    await supabase
      .from('coding_sessions')
      .update({
        last_event_sequence: highestSequence,
        event_stream_complete: isFinal ? true : session.event_stream_complete,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return {
      recordedCount: rowsToInsert.length,
      lastSequenceNumber: highestSequence,
      isComplete: isFinal ? true : Boolean(session.event_stream_complete),
    };
  },

  /**
   * Build chronological replay timeline with gap detection and integrity signals summary
   */
  async getReplayTimeline(sessionId, requestingUser) {
    const supabase = getSupabase();

    const { data: session } = await supabase
      .from('coding_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (!session) {
      throw new NotFoundError('Coding session not found.');
    }

    const isOwner = session.student_id === requestingUser.id;
    const isPrivileged = requestingUser.role === 'trainer' || requestingUser.role === 'admin';

    if (!isOwner && !isPrivileged) {
      throw new ForbiddenError('You do not have permission to view this replay timeline.');
    }

    // Fetch recorded session events in chronological sequence order
    const { data: events = [] } = await supabase
      .from('session_events')
      .select('*')
      .eq('session_id', sessionId)
      .order('sequence_number', { ascending: true });

    // Analyze sequence numbers for gaps
    let hasGaps = false;
    const missingSequences = [];

    if (events.length > 0) {
      const sortedSeqs = events.map((e) => Number(e.sequence_number)).sort((a, b) => a - b);
      for (let i = 0; i < sortedSeqs.length - 1; i++) {
        const current = sortedSeqs[i];
        const next = sortedSeqs[i + 1];
        if (next > current + 1) {
          hasGaps = true;
          for (let m = current + 1; m < next; m++) {
            missingSequences.push(m);
          }
        }
      }
    }

    // Calculate integrity event summary
    let pasteCount = 0;
    let runCount = 0;
    let submitCount = 0;
    let focusLossCount = 0;

    for (const ev of events) {
      if (ev.event_type === 'paste') pasteCount++;
      else if (ev.event_type === 'run') runCount++;
      else if (ev.event_type === 'submit') submitCount++;
      else if (ev.event_type === 'editor_blur') focusLossCount++;
      else if (ev.event_type === 'visibility_change' && ev.payload?.hidden === true) focusLossCount++;
    }

    return {
      sessionId: session.id,
      studentId: session.student_id,
      status: session.status,
      startedAt: session.started_at,
      endedAt: session.ended_at,
      isComplete: session.event_stream_complete,
      hasGaps,
      missingSequences: missingSequences.slice(0, 50),
      eventCount: events.length,
      lastSequence: session.last_event_sequence,
      retentionPolicy: {
        periodDays: 90,
        description:
          'Coding session replay events are retained for 90 days after assessment completion for integrity auditing.',
      },
      summary: {
        pasteCount,
        runCount,
        submitCount,
        focusLossCount,
      },
      events: events.map((e) => ({
        sequenceNumber: e.sequence_number,
        eventType: e.event_type,
        occurredAt: e.occurred_at,
        payload: e.payload,
        clientEventId: e.client_event_id,
      })),
    };
  },
};
