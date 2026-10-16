import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Code2,
  ArrowRight,
  TrendingUp,
  Layers,
  Sparkles,
} from 'lucide-react';
import MasteryBadge from '../common/MasteryBadge';
import Sparkline from '../common/Sparkline';
import { getMasteryLevel } from '../../utils/mastery';

export function ConceptMasteryDetailModal({ isOpen, onClose, concept }) {
  const navigate = useNavigate();
  const modalRef = useRef(null);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      modalRef.current?.focus();
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !concept) return null;

  const score = concept.mastery || concept.masteryScore || 45;
  const meta = getMasteryLevel(score);

  // Evidence and weakness explanation
  const trendData = concept.history || [30, 35, 32, 45];
  const weakPrerequisite = concept.prerequisite || 'Hash Functions & Distribution (52% · Developing)';

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="concept-detail-title"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="modal-dialog-card animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '580px', width: '100%', outline: 'none' }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: meta.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: meta.textLight,
              }}
            >
              <Layers size={16} />
            </div>
            <div>
              <h2 id="concept-detail-title" style={{ fontSize: '16px', fontWeight: '700' }}>
                {concept.name || concept.title}
              </h2>
              <div style={{ fontSize: '11.5px', color: 'var(--text-light)' }}>
                {concept.module || 'Core Curriculum Concept'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-light)', padding: '4px' }}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Current Mastery & Trend Row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 16px',
              borderRadius: '8px',
              background: 'var(--surface-muted)',
              border: '1px solid var(--border)',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.04em' }}>
                Current Mastery Status
              </div>
              <div style={{ marginTop: '4px' }}>
                <MasteryBadge score={score} size="lg" />
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.04em', marginBottom: '4px' }}>
                Historical Trend
              </div>
              <Sparkline data={trendData} color={meta.color} width={100} height={30} />
            </div>
          </div>

          {/* "Why is this weak / developing?" Section */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '8px',
              background: meta.level === 'weak' ? 'rgba(239, 68, 68, 0.08)' : meta.level === 'developing' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.08)',
              border: `1px solid ${meta.border}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: '700', color: meta.textLight, marginBottom: '6px' }}>
              <AlertTriangle size={15} />
              <span>Evidence-Based Diagnostic Analysis</span>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-main)', lineHeight: '1.5' }}>
              {concept.diagnosticNote || (
                <>
                  Failed 3 of 4 recent probe questions. Error clustering identified around collision offset calculation and secondary clustering. The prerequisite <strong>{weakPrerequisite}</strong> remains developing.
                </>
              )}
            </p>
          </div>

          {/* Identified Misconception Pattern */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px' }}>
              Identified Algorithmic Misconceptions
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span style={{ color: '#F87171', fontWeight: '700' }}>&bull;</span>
                <span>Treating quadratic probe interval <code>i^2</code> as arithmetic sum rather than index offset.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span style={{ color: '#F87171', fontWeight: '700' }}>&bull;</span>
                <span>Assuming table resizing occurs after collision rather than when load factor &alpha; exceeds threshold.</span>
              </div>
            </div>
          </div>

          {/* Recommended Next Practice */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.04em' }}>
                Recommended Remediation
              </div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginTop: '2px' }}>
                Targeted Diagnostic: Collision Resolution & Load Factor
              </div>
            </div>

            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                onClose();
                navigate('/content/quizzes');
              }}
              style={{ padding: '6px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
            >
              <span>Practice Now</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border)',
            background: 'var(--surface-muted)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button type="button" className="btn-secondary" onClick={onClose} style={{ padding: '6px 14px' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConceptMasteryDetailModal;
