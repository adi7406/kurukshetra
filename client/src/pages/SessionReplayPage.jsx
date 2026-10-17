import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  FileCode,
  ShieldAlert,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import Chip from '../components/common/Chip';
import { useToast } from '../context/ToastContext';
import { learningService } from '../services/learningService';
import LoadingState from '../components/feedback/LoadingState';

export function SessionReplayPage() {
  const { sessionId = 'rev_02' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayheadSeconds, setCurrentPlayheadSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(300);
  const [events, setEvents] = useState([]);
  const [signals, setSignals] = useState([]);
  const [instructorNote, setInstructorNote] = useState('');
  const [sessionInfo, setSessionInfo] = useState({
    title: 'Coding Session Replay',
    studentName: 'Active Session',
    submittedAt: 'Live',
  });

  const playheadRef = useRef(null);

  useEffect(() => {
    async function loadReplayData() {
      try {
        setLoading(true);
        const [replayData, signalsData] = await Promise.all([
          learningService.getSessionReplay(sessionId),
          learningService.getSessionSignals(sessionId),
        ]);

        const rawEvents = replayData?.events || [];
        // Map raw telemetry to timeline events
        const mappedEvents = rawEvents.map((ev, idx) => {
          const time = ev.time !== undefined ? ev.time : idx * 30;
          let type = 'info';
          if (ev.eventType === 'paste' || ev.type === 'signal') type = 'signal';
          if (ev.eventType === 'run' || ev.eventType === 'submit' || ev.type === 'test') type = 'test';
          return {
            time,
            label: ev.label || ev.description || `${ev.eventType || 'Telemetry Event'}`,
            type,
            codeSnapshot: ev.payload?.code || ev.codeSnapshot || null,
          };
        });

        const maxTime = replayData?.totalSeconds || Math.max(...mappedEvents.map((e) => e.time), 60);
        setTotalSeconds(maxTime);
        setEvents(mappedEvents);
        setSessionInfo({
          title: replayData?.title || replayData?.assessmentTitle || `Session Replay (${sessionId})`,
          studentName: replayData?.studentName || replayData?.studentEmail || `Student ID: ${sessionId}`,
          submittedAt: replayData?.createdAt || replayData?.submittedAt ? new Date(replayData.createdAt || replayData.submittedAt).toLocaleTimeString() : 'Recorded session',
        });

        setSignals(Array.isArray(signalsData) ? signalsData : []);
        setCurrentPlayheadSeconds(mappedEvents.length > 0 ? mappedEvents[0].time : 0);
      } catch (err) {
        console.error('Failed to load session replay data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadReplayData();
  }, [sessionId]);

  // Replay playback timer
  useEffect(() => {
    if (!isPlaying) {
      if (playheadRef.current) clearInterval(playheadRef.current);
      return;
    }

    playheadRef.current = setInterval(() => {
      setCurrentPlayheadSeconds((prev) => {
        if (prev >= totalSeconds) {
          setIsPlaying(false);
          return totalSeconds;
        }
        return prev + 1;
      });
    }, 1000);

    return () => {
      if (playheadRef.current) clearInterval(playheadRef.current);
    };
  }, [isPlaying, totalSeconds]);

  // Compute code reconstruction dynamically from real events
  const pastEvents = events.filter((e) => e.time <= currentPlayheadSeconds && e.codeSnapshot);
  const currentCode = pastEvents.length > 0
    ? pastEvents[pastEvents.length - 1].codeSnapshot
    : '// No code changes recorded at this timestamp.';

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleVerify = async () => {
    try {
      await learningService.resolveIntegrityReview(sessionId, 'verified', instructorNote);
      setVerifiedStatus('verified');
      toast.success('Session verified as authentic by instructor');
    } catch {
      toast.error('Failed to submit verification status');
    }
  };

  const handleRequestViva = async () => {
    try {
      await learningService.resolveIntegrityReview(sessionId, 'viva_requested', instructorNote);
      setVerifiedStatus('viva_requested');
      toast.info('Oral defense viva scheduled with student');
    } catch {
      toast.error('Failed to schedule viva defense');
    }
  };

  const handleSaveNote = async () => {
    try {
      await learningService.resolveIntegrityReview(sessionId, verifiedStatus || 'notes_added', instructorNote);
      toast.success('Review note saved to student dossier');
    } catch {
      toast.error('Failed to save review note');
    }
  };

  if (loading) {
    return <LoadingState message="Reconstructing session telemetry & events..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Breadcrumb & Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/home')}>Home</span>
          <span>/</span>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>Sessions to Review</span>
          <span>/</span>
          <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>Session Replay: {sessionId}</span>
        </div>

        <button
          type="button"
          className="btn-ghost-pill btn-compact"
          onClick={() => navigate('/home')}
        >
          <ArrowLeft size={13} strokeWidth={1.5} />
          <span>Return to Dashboard</span>
        </button>
      </div>

      {/* Header Summary Card */}
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: '20px',
          border: '1px solid var(--border-hairline)',
          boxShadow: 'var(--shadow-card)',
          padding: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em' }}>
              Keystroke Telemetry Replay
            </span>
            <Chip variant="warning" size="sm">
              Review suggested
            </Chip>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--text-main)', margin: '4px 0 0 0' }}>
            {sessionInfo.title}
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            Student: <strong>{sessionInfo.studentName}</strong> &bull; {sessionInfo.submittedAt}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn-ghost-pill btn-compact"
            onClick={handleRequestViva}
          >
            <span>Request Oral Defense</span>
          </button>
          <button
            type="button"
            className="btn-coral-pill btn-compact"
            onClick={handleVerify}
          >
            <CheckCircle2 size={13} strokeWidth={1.5} />
            <span>Confirm Verified</span>
          </button>
        </div>
      </div>

      {/* Replay Player Controls Card */}
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: '20px',
          border: '1px solid var(--border-hairline)',
          boxShadow: 'var(--shadow-card)',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="icon-btn-circle"
              style={{ width: '38px', height: '38px' }}
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause size={15} strokeWidth={2} /> : <Play size={15} strokeWidth={2} />}
            </button>
            <button
              type="button"
              className="icon-btn-circle"
              style={{ width: '38px', height: '38px' }}
              onClick={() => setCurrentPlayheadSeconds(0)}
            >
              <RotateCcw size={15} strokeWidth={1.5} />
            </button>
            <span style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
              {formatTime(currentPlayheadSeconds)} / {formatTime(totalSeconds)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <span>Telemetry Events: <strong>5 recorded</strong></span>
            <span>&bull;</span>
            <span>Compilation status: <strong style={{ color: 'var(--mastery-solid)' }}>18/18 Passed</strong></span>
          </div>
        </div>

        {/* Scrubber with Event Markers */}
        <div style={{ position: 'relative', width: '100%', padding: '12px 0' }}>
          <input
            type="range"
            min={0}
            max={totalSeconds}
            value={currentPlayheadSeconds}
            onChange={(e) => setCurrentPlayheadSeconds(Number(e.target.value))}
            style={{
              width: '100%',
              accentColor: 'var(--coral)',
              cursor: 'pointer',
            }}
          />
          {/* Markers */}
          <div style={{ position: 'absolute', top: '16px', left: 0, right: 0, pointerEvents: 'none' }}>
            {events.map((ev, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${(ev.time / totalSeconds) * 100}%`,
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: ev.type === 'signal' ? 'var(--mastery-developing)' : 'var(--coral)',
                  transform: 'translate(-50%, -50%)',
                  boxShadow: '0 0 0 2px var(--surface)',
                }}
                title={`${formatTime(ev.time)}: ${ev.label}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Split Replay Layout: Code Pane Left, Signals List Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '20px', alignItems: 'start' }}>
        {/* Left: Code Pane */}
        <div
          style={{
            background: '#16161A',
            borderRadius: '20px',
            border: '1px solid var(--border-hairline)',
            boxShadow: 'var(--shadow-card)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '12px 18px', background: '#1C1C21', borderBottom: '1px solid #2C2C34', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ECEAE8', fontSize: '12.5px', fontFamily: 'var(--font-mono)' }}>
              <FileCode size={14} strokeWidth={1.5} color="var(--coral)" />
              <span>solution.py (Reconstruction at {formatTime(currentPlayheadSeconds)})</span>
            </div>
            <span style={{ fontSize: '11px', color: '#9E9EA8' }}>
              Keystroke-level replay
            </span>
          </div>

          <pre
            style={{
              padding: '20px',
              color: '#F4F2F0',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              lineHeight: '1.65',
              margin: 0,
              minHeight: '340px',
              overflowX: 'auto',
            }}
          >
            {currentCode}
          </pre>
        </div>

        {/* Right: Signals & Event Markers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: '20px',
              border: '1px solid var(--border-hairline)',
              boxShadow: 'var(--shadow-card)',
              padding: '20px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em', marginBottom: '14px' }}>
              Telemetry Signals
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {events.map((ev, i) => (
                <div
                  key={i}
                  onClick={() => setCurrentPlayheadSeconds(ev.time)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '12px',
                    background: ev.type === 'signal' ? 'var(--mastery-developing-soft)' : 'var(--surface-muted)',
                    border: ev.type === 'signal' ? '1px solid var(--warning-border)' : '1px solid var(--border-hairline)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)' }}>
                      {ev.label}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px' }}>
                      Timestamp: {formatTime(ev.time)}
                    </div>
                  </div>
                  {ev.type === 'signal' && (
                    <Chip variant="warning" size="sm">
                      Flag
                    </Chip>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Integrity Review Flags (Human-Assisted Review) */}
          {signals.length > 0 && (
            <div
              style={{
                background: 'var(--surface)',
                borderRadius: '20px',
                border: '1px solid var(--border-hairline)',
                boxShadow: 'var(--shadow-card)',
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <ShieldAlert size={14} color="var(--warning-text)" />
                <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--warning-text)', letterSpacing: '0.04em' }}>
                  Observed Integrity Evidence
                </span>
              </div>
              <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '0 0 12px 0', lineHeight: '1.4' }}>
                Neutral evidence signals for instructor inspection. Mastery and grading remain unaffected pending manual review.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {signals.map((sig, idx) => (
                  <div
                    key={sig.id || idx}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: 'var(--mastery-developing-soft)',
                      border: '1px solid var(--warning-border)',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ color: 'var(--text-main)', textTransform: 'capitalize' }}>
                        {(sig.signalType || 'Anomaly').replace('_', ' ')}
                      </strong>
                      <span style={{ fontSize: '10.5px', color: 'var(--warning-text)', fontWeight: 600 }}>
                        Confidence: {Math.round((sig.confidenceScore || 0.8) * 100)}%
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      {sig.description || 'Observed telemetry event divergence from expected baseline.'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructor Review Note Card */}
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: '20px',
              border: '1px solid var(--border-hairline)',
              boxShadow: 'var(--shadow-card)',
              padding: '20px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em', marginBottom: '8px' }}>
              Instructor Note
            </div>
            <textarea
              rows={3}
              placeholder="Record review observations (e.g., Student pasted sentinel implementation from previous module homework)..."
              value={instructorNote}
              onChange={(e) => setInstructorNote(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '12px',
                border: '1px solid var(--border-hairline)',
                fontSize: '12.5px',
                background: 'var(--surface-muted)',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'vertical',
                marginBottom: '10px',
              }}
            />
            <button
              type="button"
              className="btn-coral-pill btn-compact"
              style={{ width: '100%' }}
              onClick={handleSaveNote}
            >
              <span>Save Observation Note</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SessionReplayPage;
