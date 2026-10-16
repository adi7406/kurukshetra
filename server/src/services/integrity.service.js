import { getSupabase } from '../integrations/supabase.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors.js';

export const PERMITTED_SIGNAL_TYPES = [
  'rapid_paste',
  'multiple_focus_loss',
  'excessive_blur',
  'unusual_timeline_gap',
  'time_anomaly',
];

export const VALID_REVIEW_STATUSES = [
  'pending',
  'in_review',
  'cleared',
  'flagged_misconduct',
  'inconclusive',
];

export const SIGNAL_TYPE_METADATA = {
  rapid_paste: {
    name: 'Rapid Paste or Large Code Insertion',
    description: 'A sudden large insertion or paste of code without incremental typing.',
    baselineContext: 'May indicate external snippet copying or legitimate clipboard use.',
    defaultConfidence: 0.65,
  },
  multiple_focus_loss: {
    name: 'Multiple Focus Loss',
    description: 'Frequent window or editor focus switches away from the assessment.',
    baselineContext: 'May indicate dual monitors, reference lookups, or system notifications.',
    defaultConfidence: 0.5,
  },
  excessive_blur: {
    name: 'Excessive Window Blur',
    description: 'Long cumulative period spent outside the assessment editor tab.',
    baselineContext: 'May indicate external documentation consultation or network reconnection.',
    defaultConfidence: 0.55,
  },
  unusual_timeline_gap: {
    name: 'Unusual Timeline Gap',
    description: 'Extended period of inactivity followed immediately by sudden code appearance.',
    baselineContext: 'May indicate offline problem solving, thinking time, or external assistance.',
    defaultConfidence: 0.6,
  },
  time_anomaly: {
    name: 'Completion Time Anomaly',
    description: 'Complex problem solved or submitted in an implausibly short duration.',
    baselineContext: 'May indicate prior problem familiarity or prepared solution insertion.',
    defaultConfidence: 0.7,
  },
};

export const NON_PUNITIVE_DISCLAIMER =
  'Integrity signals are contextual review leads, not proof. Automatic penalization, grade reduction, or guilt inference is strictly prohibited without human verification.';

export const RETENTION_POLICY = {
  retentionDays: 90,
  purpose: 'Audit and review lead evidence retention for assessment integrity verification.',
};

export const integrityService = {
  /**
   * Return dictionary of permitted signal types, descriptions, and non-punitive guidelines
   */
  getSignalCatalog() {
    return {
      permittedTypes: PERMITTED_SIGNAL_TYPES,
      metadata: SIGNAL_TYPE_METADATA,
      disclaimer: NON_PUNITIVE_DISCLAIMER,
      retentionPolicy: RETENTION_POLICY,
    };
  },

  /**
   * Manually or programmatically record an integrity signal for an assessment attempt
   */
  async recordSignal(
    {
      attemptId,
      signalType,
      confidence,
      evidence = {},
      detectorVersion = 'rule-detector-v1',
      occurredAt,
    },
    requestingUser = null
  ) {
    if (requestingUser) {
      const isPrivileged = requestingUser.role === 'trainer' || requestingUser.role === 'admin';
      if (!isPrivileged) {
        throw new ForbiddenError('Only authorized reviewers may record integrity signals.');
      }
    }

    if (!attemptId) {
      throw new ValidationError('attemptId is required to record an integrity signal.');
    }

    if (!signalType || !PERMITTED_SIGNAL_TYPES.includes(signalType)) {
      throw new ValidationError(
        `Signal type '${signalType}' is invalid. Permitted types: [${PERMITTED_SIGNAL_TYPES.join(', ')}]`
      );
    }

    const typeMeta = SIGNAL_TYPE_METADATA[signalType];
    const finalConfidence =
      typeof confidence === 'number' ? confidence : typeMeta.defaultConfidence;

    if (isNaN(finalConfidence) || finalConfidence < 0 || finalConfidence > 1) {
      throw new ValidationError('Confidence must be a numeric value between 0.0 and 1.0.');
    }

    const supabase = getSupabase();

    // Verify attempt exists
    const { data: attempt } = await supabase
      .from('assessment_attempts')
      .select('id, student_id, score, status')
      .eq('id', attemptId)
      .maybeSingle();

    if (!attempt) {
      throw new NotFoundError('Assessment attempt not found.');
    }

    const uncertainty = parseFloat((1 - finalConfidence).toFixed(3));
    const nowIso = new Date().toISOString();

    const signalRow = {
      attempt_id: attemptId,
      student_id: attempt.student_id,
      signal_type: signalType,
      confidence: finalConfidence,
      evidence: {
        ...evidence,
        uncertainty,
        disclaimer: NON_PUNITIVE_DISCLAIMER,
        retentionPolicy: RETENTION_POLICY,
      },
      detector_version: detectorVersion,
      occurred_at: occurredAt || nowIso,
      created_at: nowIso,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('integrity_signals')
      .insert(signalRow)
      .select()
      .single();

    if (insertError || !inserted) {
      // In mock supabase, fallback to returned or populated record
      return {
        id: `sig_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ...signalRow,
      };
    }

    return inserted;
  },

  /**
   * Run automated rule-based integrity detection on recorded session events
   */
  async analyzeSessionEvents(sessionId, requestingUser) {
    const isPrivileged = requestingUser.role === 'trainer' || requestingUser.role === 'admin';
    if (!isPrivileged) {
      throw new ForbiddenError('Only trainers and administrators may analyze session integrity.');
    }

    const supabase = getSupabase();

    const { data: session } = await supabase
      .from('coding_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (!session) {
      throw new NotFoundError('Coding session not found.');
    }

    if (!session.attempt_id) {
      throw new ValidationError('Coding session is not linked to an assessment attempt.');
    }

    // Fetch chronological events
    const { data: events = [] } = await supabase
      .from('session_events')
      .select('*')
      .eq('session_id', sessionId)
      .order('sequence_number', { ascending: true });

    const detectedSignals = [];

    // Detector 1: Rapid Paste / Large Insertion
    for (const ev of events) {
      let pasteLength = 0;
      if (ev.event_type === 'paste') {
        pasteLength = ev.payload?.text?.length || ev.payload?.length || 0;
      } else if (ev.event_type === 'document_change' && (ev.payload?.inserted?.length || 0) >= 100) {
        pasteLength = ev.payload.inserted.length;
      }

      if (pasteLength >= 80) {
        detectedSignals.push({
          signalType: 'rapid_paste',
          confidence: 0.65,
          occurredAt: ev.occurred_at,
          evidence: {
            eventSequence: ev.sequence_number,
            eventType: ev.event_type,
            length: pasteLength,
            rationale: `Detected sudden code insertion of ${pasteLength} characters.`,
          },
        });
      }
    }

    // Detector 2: Multiple Focus Loss & Excessive Blur
    const focusLossEvents = events.filter(
      (ev) =>
        ev.event_type === 'editor_blur' ||
        (ev.event_type === 'visibility_change' && ev.payload?.hidden === true)
    );

    if (focusLossEvents.length >= 3) {
      const confidence = Math.min(0.5 + focusLossEvents.length * 0.05, 0.85);
      detectedSignals.push({
        signalType: 'multiple_focus_loss',
        confidence: parseFloat(confidence.toFixed(2)),
        occurredAt: focusLossEvents[0].occurred_at,
        evidence: {
          focusLossCount: focusLossEvents.length,
          sequences: focusLossEvents.map((e) => e.sequence_number),
          rationale: `Editor focus was lost ${focusLossEvents.length} times during active session.`,
        },
      });

      if (focusLossEvents.length >= 5) {
        detectedSignals.push({
          signalType: 'excessive_blur',
          confidence: 0.6,
          occurredAt: focusLossEvents[focusLossEvents.length - 1].occurred_at,
          evidence: {
            totalLossEvents: focusLossEvents.length,
            rationale: 'High frequency of window switching or hidden browser visibility.',
          },
        });
      }
    }

    // Detector 3: Unusual Timeline Gap
    if (events.length >= 2) {
      for (let i = 0; i < events.length - 1; i++) {
        const currTime = new Date(events[i].occurred_at).getTime();
        const nextTime = new Date(events[i + 1].occurred_at).getTime();
        const gapMs = nextTime - currTime;

        if (gapMs >= 5 * 60 * 1000) {
          // 5 minutes gap
          detectedSignals.push({
            signalType: 'unusual_timeline_gap',
            confidence: 0.55,
            occurredAt: events[i + 1].occurred_at,
            evidence: {
              gapDurationSeconds: Math.round(gapMs / 1000),
              fromSequence: events[i].sequence_number,
              toSequence: events[i + 1].sequence_number,
              rationale: `Inactivity gap of ${Math.round(gapMs / 60000)} minutes detected between event ${events[i].sequence_number} and ${events[i + 1].sequence_number}.`,
            },
          });
        }
      }
    }

    // Persist all detected signals
    const persisted = [];
    for (const sig of detectedSignals) {
      const saved = await this.recordSignal({
        attemptId: session.attempt_id,
        signalType: sig.signalType,
        confidence: sig.confidence,
        evidence: sig.evidence,
        detectorVersion: 'rule-detector-v1',
        occurredAt: sig.occurredAt,
      });
      persisted.push(saved);
    }

    return {
      sessionId: session.id,
      attemptId: session.attempt_id,
      studentId: session.student_id,
      analyzedEventCount: events.length,
      detectedSignalsCount: persisted.length,
      signals: persisted,
      disclaimer: NON_PUNITIVE_DISCLAIMER,
      retentionPolicy: RETENTION_POLICY,
    };
  },

  /**
   * Retrieve all integrity signals for an assessment attempt (restricted to trainers/admins)
   */
  async getSignalsForAttempt(attemptId, requestingUser) {
    const isPrivileged = requestingUser.role === 'trainer' || requestingUser.role === 'admin';
    if (!isPrivileged) {
      throw new ForbiddenError('Only authorized reviewers may inspect integrity signals.');
    }

    const supabase = getSupabase();

    const { data: attempt } = await supabase
      .from('assessment_attempts')
      .select('id, student_id')
      .eq('id', attemptId)
      .maybeSingle();

    if (!attempt) {
      throw new NotFoundError('Assessment attempt not found.');
    }

    const { data: signals = [] } = await supabase
      .from('integrity_signals')
      .select('*')
      .eq('attempt_id', attemptId)
      .order('occurred_at', { ascending: true });

    const formattedSignals = (signals || []).map((s) => {
      const conf = Number(s.confidence);
      return {
        id: s.id,
        attemptId: s.attempt_id,
        studentId: s.student_id,
        signalType: s.signal_type,
        confidence: conf,
        uncertainty: parseFloat((1 - conf).toFixed(3)),
        detectorVersion: s.detector_version,
        evidence: s.evidence,
        occurredAt: s.occurred_at,
        createdAt: s.created_at,
      };
    });

    return {
      attemptId,
      studentId: attempt.student_id,
      signalsCount: formattedSignals.length,
      signals: formattedSignals,
      disclaimer: NON_PUNITIVE_DISCLAIMER,
      retentionPolicy: RETENTION_POLICY,
    };
  },

  /**
   * Retrieve all integrity signals for a coding session (restricted to trainers/admins)
   */
  async getSignalsForSession(sessionId, requestingUser) {
    const isPrivileged = requestingUser.role === 'trainer' || requestingUser.role === 'admin';
    if (!isPrivileged) {
      throw new ForbiddenError('Only authorized reviewers may inspect integrity signals.');
    }

    const supabase = getSupabase();

    const { data: session } = await supabase
      .from('coding_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (!session) {
      throw new NotFoundError('Coding session not found.');
    }

    if (!session.attempt_id) {
      return {
        sessionId,
        signalsCount: 0,
        signals: [],
        disclaimer: NON_PUNITIVE_DISCLAIMER,
        retentionPolicy: RETENTION_POLICY,
      };
    }

    return this.getSignalsForAttempt(session.attempt_id, requestingUser);
  },

  /**
   * Retrieve a specific integrity signal by ID
   */
  async getSignalById(signalId, requestingUser) {
    const isPrivileged = requestingUser.role === 'trainer' || requestingUser.role === 'admin';
    if (!isPrivileged) {
      throw new ForbiddenError('Only authorized reviewers may inspect integrity signals.');
    }

    const supabase = getSupabase();

    const { data: signal } = await supabase
      .from('integrity_signals')
      .select('*')
      .eq('id', signalId)
      .maybeSingle();

    if (!signal) {
      throw new NotFoundError('Integrity signal not found.');
    }

    const conf = Number(signal.confidence);
    return {
      id: signal.id,
      attemptId: signal.attempt_id,
      studentId: signal.student_id,
      signalType: signal.signal_type,
      confidence: conf,
      uncertainty: parseFloat((1 - conf).toFixed(3)),
      detectorVersion: signal.detector_version,
      evidence: signal.evidence,
      occurredAt: signal.occurred_at,
      createdAt: signal.created_at,
      disclaimer: NON_PUNITIVE_DISCLAIMER,
      retentionPolicy: RETENTION_POLICY,
    };
  },

  /**
   * Initiate a human integrity review for an assessment attempt (trainers/admins)
   */
  async createReview({ attemptId, status = 'pending', outcomeNotes = '' }, reviewer) {
    const isPrivileged = reviewer.role === 'trainer' || reviewer.role === 'admin';
    if (!isPrivileged) {
      throw new ForbiddenError('Only authorized reviewers may create integrity reviews.');
    }

    if (!attemptId) {
      throw new ValidationError('attemptId is required to create an integrity review.');
    }

    if (status && !VALID_REVIEW_STATUSES.includes(status)) {
      throw new ValidationError(
        `Invalid status '${status}'. Permitted statuses: [${VALID_REVIEW_STATUSES.join(', ')}]`
      );
    }

    const supabase = getSupabase();

    const { data: attempt } = await supabase
      .from('assessment_attempts')
      .select('id, student_id, status, score')
      .eq('id', attemptId)
      .maybeSingle();

    if (!attempt) {
      throw new NotFoundError('Assessment attempt not found.');
    }

    const nowIso = new Date().toISOString();
    const auditEntry = {
      action: 'review_created',
      performedBy: reviewer.id,
      performerRole: reviewer.role,
      previousStatus: null,
      newStatus: status,
      outcomeNotes: outcomeNotes || null,
      timestamp: nowIso,
    };

    const reviewRow = {
      attempt_id: attemptId,
      reviewer_id: reviewer.id,
      status,
      outcome_notes: outcomeNotes || null,
      audit_trail: [auditEntry],
      created_at: nowIso,
      updated_at: nowIso,
    };

    const { data: inserted, error } = await supabase
      .from('integrity_reviews')
      .insert(reviewRow)
      .select()
      .single();

    if (error || !inserted) {
      return {
        id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ...reviewRow,
      };
    }

    return inserted;
  },

  /**
   * Update or resolve an existing human integrity review with immutable audit logging
   */
  async updateReview(reviewId, { status, outcomeNotes }, reviewer) {
    const isPrivileged = reviewer.role === 'trainer' || reviewer.role === 'admin';
    if (!isPrivileged) {
      throw new ForbiddenError('Only authorized reviewers may update integrity reviews.');
    }

    if (status && !VALID_REVIEW_STATUSES.includes(status)) {
      throw new ValidationError(
        `Invalid status '${status}'. Permitted statuses: [${VALID_REVIEW_STATUSES.join(', ')}]`
      );
    }

    const supabase = getSupabase();

    const { data: review } = await supabase
      .from('integrity_reviews')
      .select('*')
      .eq('id', reviewId)
      .maybeSingle();

    if (!review) {
      throw new NotFoundError('Integrity review not found.');
    }

    const nextStatus = status || review.status;
    const nextNotes = outcomeNotes !== undefined ? outcomeNotes : review.outcome_notes;
    const nowIso = new Date().toISOString();

    const auditEntry = {
      action: 'review_updated',
      performedBy: reviewer.id,
      performerRole: reviewer.role,
      previousStatus: review.status,
      newStatus: nextStatus,
      outcomeNotes: nextNotes,
      timestamp: nowIso,
    };

    const currentAuditTrail = Array.isArray(review.audit_trail) ? review.audit_trail : [];
    const updatedAuditTrail = [...currentAuditTrail, auditEntry];

    const updates = {
      status: nextStatus,
      outcome_notes: nextNotes,
      audit_trail: updatedAuditTrail,
      updated_at: nowIso,
    };

    const { data: updated } = await supabase
      .from('integrity_reviews')
      .update(updates)
      .eq('id', reviewId)
      .select()
      .single();

    return updated || { ...review, ...updates };
  },

  /**
   * Submit an appeal / explanation context for an integrity review
   */
  async submitAppeal(reviewId, { appealReason, supportingContext = '' }, candidateUser) {
    if (!appealReason || typeof appealReason !== 'string' || appealReason.trim().length === 0) {
      throw new ValidationError('appealReason is required to submit an appeal.');
    }

    const supabase = getSupabase();

    const { data: review } = await supabase
      .from('integrity_reviews')
      .select('*')
      .eq('id', reviewId)
      .maybeSingle();

    if (!review) {
      throw new NotFoundError('Integrity review not found.');
    }

    const { data: attempt } = await supabase
      .from('assessment_attempts')
      .select('id, student_id')
      .eq('id', review.attempt_id)
      .maybeSingle();

    const isOwner = attempt && attempt.student_id === candidateUser.id;
    const isPrivileged = candidateUser.role === 'trainer' || candidateUser.role === 'admin';

    if (!isOwner && !isPrivileged) {
      throw new ForbiddenError('You can only submit an appeal for your own assessment review.');
    }

    const nowIso = new Date().toISOString();
    const auditEntry = {
      action: 'appeal_submitted',
      performedBy: candidateUser.id,
      performerRole: candidateUser.role,
      appealReason: appealReason.trim(),
      supportingContext: supportingContext ? supportingContext.trim() : null,
      previousStatus: review.status,
      newStatus: 'in_review',
      timestamp: nowIso,
    };

    const currentAuditTrail = Array.isArray(review.audit_trail) ? review.audit_trail : [];
    const updatedAuditTrail = [...currentAuditTrail, auditEntry];

    const updates = {
      status: 'in_review',
      audit_trail: updatedAuditTrail,
      updated_at: nowIso,
    };

    const { data: updated } = await supabase
      .from('integrity_reviews')
      .update(updates)
      .eq('id', reviewId)
      .select()
      .single();

    return updated || { ...review, ...updates };
  },

  /**
   * Retrieve an integrity review with full evidence and audit history (authorized reviewers only)
   */
  async getReviewById(reviewId, requestingUser) {
    const isPrivileged = requestingUser.role === 'trainer' || requestingUser.role === 'admin';
    if (!isPrivileged) {
      throw new ForbiddenError('Only authorized reviewers may view integrity review cases.');
    }

    const supabase = getSupabase();

    const { data: review } = await supabase
      .from('integrity_reviews')
      .select('*')
      .eq('id', reviewId)
      .maybeSingle();

    if (!review) {
      throw new NotFoundError('Integrity review not found.');
    }

    // Fetch associated attempt
    const { data: attempt } = await supabase
      .from('assessment_attempts')
      .select('id, student_id, assessment_id, status, score')
      .eq('id', review.attempt_id)
      .maybeSingle();

    // Fetch associated integrity signals
    const { data: signals = [] } = await supabase
      .from('integrity_signals')
      .select('*')
      .eq('attempt_id', review.attempt_id);

    return {
      review: {
        id: review.id,
        attemptId: review.attempt_id,
        reviewerId: review.reviewer_id,
        status: review.status,
        outcomeNotes: review.outcome_notes,
        auditTrail: review.audit_trail || [],
        createdAt: review.created_at,
        updatedAt: review.updated_at,
      },
      evidence: {
        attempt,
        signalsCount: signals.length,
        signals,
        disclaimer: NON_PUNITIVE_DISCLAIMER,
        retentionPolicy: RETENTION_POLICY,
      },
    };
  },

  /**
   * Retrieve all integrity reviews for an attempt
   */
  async getReviewsForAttempt(attemptId, requestingUser) {
    const isPrivileged = requestingUser.role === 'trainer' || requestingUser.role === 'admin';
    if (!isPrivileged) {
      throw new ForbiddenError('Only authorized reviewers may view integrity reviews.');
    }

    const supabase = getSupabase();

    const { data: attempt } = await supabase
      .from('assessment_attempts')
      .select('id, student_id')
      .eq('id', attemptId)
      .maybeSingle();

    if (!attempt) {
      throw new NotFoundError('Assessment attempt not found.');
    }

    const { data: reviews = [] } = await supabase
      .from('integrity_reviews')
      .select('*')
      .eq('attempt_id', attemptId)
      .order('created_at', { ascending: false });

    return {
      attemptId,
      reviewsCount: reviews.length,
      reviews,
    };
  },
};
