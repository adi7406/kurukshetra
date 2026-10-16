import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  Code2,
  Clock,
  User,
  Shield,
  ArrowLeft,
  Info,
  CheckCircle2,
} from 'lucide-react';
import MasteryBadge from '../components/common/MasteryBadge';

export function SessionReplayPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Event sequence reflecting recorded keystrokes, runs, and pastes
  const sessionEvents = [
    {
      timestamp: '00:15',
      timeSec: 15,
      type: 'typing',
      label: 'Initial Class Definition',
      code: `class Node {\n  constructor(key, value) {\n    this.key = key;\n    this.val = value;\n    this.prev = null;\n    this.next = null;\n  }\n}`,
      signal: null,
    },
    {
      timestamp: '01:05',
      timeSec: 65,
      type: 'typing',
      label: 'Constructor & Map Map Setup',
      code: `class Node {\n  constructor(key, value) {\n    this.key = key;\n    this.val = value;\n    this.prev = null;\n    this.next = null;\n  }\n}\n\nclass LRUCache {\n  constructor(capacity) {\n    this.cap = capacity;\n    this.cache = new Map();\n  }\n}`,
      signal: null,
    },
    {
      timestamp: '02:14',
      timeSec: 134,
      type: 'paste',
      label: 'Large Paste Event (+340 chars)',
      code: `class Node {\n  constructor(key, value) {\n    this.key = key;\n    this.val = value;\n    this.prev = null;\n    this.next = null;\n  }\n}\n\nclass LRUCache {\n  constructor(capacity) {\n    this.cap = capacity;\n    this.cache = new Map();\n    this.head = new Node(0, 0);\n    this.tail = new Node(0, 0);\n    this.head.next = this.tail;\n    this.tail.prev = this.head;\n  }\n\n  _remove(node) {\n    node.prev.next = node.next;\n    node.next.prev = node.prev;\n  }\n\n  _add(node) {\n    node.next = this.head.next;\n    node.prev = this.head;\n    this.head.next.prev = node;\n    this.head.next = node;\n  }\n}`,
      signal: {
        type: 'Sudden Large Clipboard Insertion',
        severity: 'neutral',
        details: '340 characters pasted in single event at line 18. Contextual evidence for faculty review.',
      },
    },
    {
      timestamp: '03:40',
      timeSec: 220,
      type: 'run',
      label: 'Sandbox Run (Judge0)',
      code: `class Node {\n  constructor(key, value) {\n    this.key = key;\n    this.val = value;\n    this.prev = null;\n    this.next = null;\n  }\n}\n\nclass LRUCache {\n  constructor(capacity) {\n    this.cap = capacity;\n    this.cache = new Map();\n    this.head = new Node(0, 0);\n    this.tail = new Node(0, 0);\n    this.head.next = this.tail;\n    this.tail.prev = this.head;\n  }\n\n  _remove(node) {\n    node.prev.next = node.next;\n    node.next.prev = node.prev;\n  }\n\n  _add(node) {\n    node.next = this.head.next;\n    node.prev = this.head;\n    this.head.next.prev = node;\n    this.head.next = node;\n  }\n\n  get(key) {\n    if (this.cache.has(key)) {\n      const n = this.cache.get(key);\n      this._remove(n);\n      this._add(n);\n      return n.val;\n    }\n    return -1;\n  }\n}`,
      signal: null,
    },
    {
      timestamp: '04:55',
      timeSec: 295,
      type: 'submit',
      label: 'Official Submission (18/18 Tests Passed)',
      code: `class Node {\n  constructor(key, value) {\n    this.key = key;\n    this.val = value;\n    this.prev = null;\n    this.next = null;\n  }\n}\n\nclass LRUCache {\n  constructor(capacity) {\n    this.cap = capacity;\n    this.cache = new Map();\n    this.head = new Node(0, 0);\n    this.tail = new Node(0, 0);\n    this.head.next = this.tail;\n    this.tail.prev = this.head;\n  }\n\n  _remove(node) {\n    node.prev.next = node.next;\n    node.next.prev = node.prev;\n  }\n\n  _add(node) {\n    node.next = this.head.next;\n    node.prev = this.head;\n    this.head.next.prev = node;\n    this.head.next = node;\n  }\n\n  get(key) {\n    if (this.cache.has(key)) {\n      const n = this.cache.get(key);\n      this._remove(n);\n      this._add(n);\n      return n.val;\n    }\n    return -1;\n  }\n\n  put(key, val) {\n    if (this.cache.has(key)) {\n      this._remove(this.cache.get(key));\n    }\n    const n = new Node(key, val);\n    this._add(n);\n    this.cache.set(key, n);\n    if (this.cache.size > this.cap) {\n      const lru = this.tail.prev;\n      this._remove(lru);\n      this.cache.delete(lru.key);\n    }\n  }\n}`,
      signal: null,
    },
  ];

  const activeEvent = sessionEvents[currentStep] || sessionEvents[0];

  useEffect(() => {
    let timer;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= sessionEvents.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2000 / playbackSpeed);
    }
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, sessionEvents.length]);

  return (
    <div style={{ padding: '0 24px 32px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => navigate(-1)}
          style={{ padding: '6px 12px', fontSize: '12.5px' }}
        >
          <ArrowLeft size={14} />
          <span>Back to Instructor Workspace</span>
        </button>

        {/* Disclaimer as required by Section 7.2 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-light)' }}>
          <Info size={14} color="var(--primary)" />
          <span>Event-based keystroke reconstruction &bull; Contextual human review workspace</span>
        </div>
      </div>

      {/* Session Metadata Header */}
      <div className="saas-card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge-clean blue">Coding Session Replay</span>
              <span className="badge-clean amber">Session #{sessionId || 'rev_02'}</span>
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: '800', marginTop: '6px' }}>
              LRU Cache Design (Doubly-Linked Sentinel)
            </h1>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Student: <strong>Rohan Mehra</strong> (23CS108) &bull; Submitted Oct 16, 2026 at 01:14 PM &bull; 18/18 Tests Passed
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <MasteryBadge score={78} size="md" />
            <button
              type="button"
              className="btn-primary"
              onClick={() => alert('Session flagged status confirmed as reviewed and acknowledged.')}
              style={{ padding: '7px 14px', fontSize: '12px' }}
            >
              <CheckCircle2 size={14} />
              <span>Mark Session Reviewed</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Replay Workspace Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '20px' }}>
        {/* Code State Pane */}
        <div className="saas-card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              padding: '10px 16px',
              background: 'var(--surface-muted)',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '600' }}>
              <Code2 size={15} color="var(--primary)" />
              <span>Recorded Editor State at {activeEvent.timestamp}</span>
            </div>

            <span className="badge-clean blue" style={{ textTransform: 'capitalize' }}>
              {activeEvent.type} Event
            </span>
          </div>

          {/* Syntax Code Display */}
          <pre
            style={{
              margin: 0,
              padding: '16px',
              background: '#0B1120',
              color: '#F8FAFC',
              fontFamily: 'var(--font-mono)',
              fontSize: '12.5px',
              lineHeight: '1.6',
              minHeight: '380px',
              maxHeight: '520px',
              overflowY: 'auto',
            }}
          >
            <code>{activeEvent.code}</code>
          </pre>

          {/* Timeline Playback Bar */}
          <div
            style={{
              padding: '14px 18px',
              background: 'var(--surface)',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {/* Step markers slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', minWidth: '40px' }}>
                {activeEvent.timestamp}
              </span>

              <input
                type="range"
                min={0}
                max={sessionEvents.length - 1}
                value={currentStep}
                onChange={(e) => setCurrentStep(Number(e.target.value))}
                style={{ flex: 1, cursor: 'pointer' }}
                aria-label="Replay timeline scrub"
              />

              <span style={{ fontSize: '12px', color: 'var(--text-light)', minWidth: '40px', textAlign: 'right' }}>
                04:55
              </span>
            </div>

            {/* Controls Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setIsPlaying((prev) => !prev)}
                  style={{ padding: '6px 14px', fontSize: '12px' }}
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  <span>{isPlaying ? 'Pause' : 'Play Replay'}</span>
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStep(0);
                  }}
                  style={{ padding: '6px 10px' }}
                  title="Reset to beginning"
                >
                  <RotateCcw size={14} />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-light)' }}>Speed:</span>
                {[1, 2, 4].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setPlaybackSpeed(spd)}
                    style={{
                      background: playbackSpeed === spd ? 'var(--primary)' : 'var(--surface-muted)',
                      color: playbackSpeed === spd ? '#FFF' : 'var(--text-main)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      padding: '2px 7px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Signals List on the Right */}
        <div className="saas-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={16} color="var(--primary)" />
              <h3 style={{ fontSize: '14px', fontWeight: '700' }}>Timeline Integrity Signals</h3>
            </div>
            <span className="badge-clean amber">1 Flagged</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sessionEvents.map((evt, idx) => {
              const isSelected = idx === currentStep;
              const hasSignal = Boolean(evt.signal);

              return (
                <div
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: isSelected
                      ? 'var(--primary-subtle)'
                      : hasSignal
                      ? 'rgba(245, 158, 11, 0.08)'
                      : 'var(--surface-muted)',
                    border: isSelected
                      ? '1px solid var(--primary-border)'
                      : hasSignal
                      ? '1px solid var(--warning-border)'
                      : '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all 120ms ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: hasSignal ? '#FBBF24' : 'var(--text-light)' }}>
                      {evt.timestamp}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        background: evt.type === 'paste' ? 'rgba(239, 68, 68, 0.15)' : evt.type === 'run' ? 'rgba(59, 130, 246, 0.15)' : 'var(--surface)',
                        color: evt.type === 'paste' ? '#F87171' : evt.type === 'run' ? '#60A5FA' : 'var(--text-light)',
                      }}
                    >
                      {evt.type}
                    </span>
                  </div>

                  <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-main)', marginTop: '4px' }}>
                    {evt.label}
                  </div>

                  {evt.signal && (
                    <div style={{ marginTop: '6px', fontSize: '11.5px', color: '#FBBF24', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                      <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{evt.signal.details}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div
            style={{
              padding: '10px',
              borderRadius: '6px',
              background: 'var(--surface-subtle)',
              border: '1px solid var(--border)',
              fontSize: '11.5px',
              color: 'var(--text-light)',
              lineHeight: '1.45',
            }}
          >
            <strong>Reviewer Note:</strong> Automated integrity signals represent behavioral markers for instructor context, never proof of misconduct.
          </div>
        </div>
      </div>
    </div>
  );
}

export default SessionReplayPage;
