import React, { useEffect, useRef } from 'react';
import { ArrowRight, X, Sparkles, CheckCircle2, AlertTriangle, GitFork } from 'lucide-react';
import MasteryBadge from '../common/MasteryBadge';
import { normalizeMastery } from '../../utils/mastery';

export function WhyThisModal({ isOpen, onClose, recommendation, onStartActivity }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      dialogRef.current?.focus();
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !recommendation) return null;

  const rawPath = recommendation.prerequisitePath || [
    { name: 'Dynamic Arrays & Memory', score: 92, status: 'solid' },
    { name: 'Hash Functions & Distribution', score: 52, status: 'developing', isWeakest: true },
    { name: recommendation.conceptName || 'Hash Tables & Collision Resolution', score: 48, status: 'developing', isTarget: true },
  ];

  const path = rawPath.map((step) => ({
    ...step,
    score: normalizeMastery(step.score),
  }));

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="why-this-title"
    >
      <div
        ref={dialogRef}
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
                background: 'var(--primary-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
              }}
            >
              <GitFork size={16} />
            </div>
            <div>
              <h2 id="why-this-title" style={{ fontSize: '16px', fontWeight: '700' }}>
                Why This Recommendation?
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Evidence-based adaptive curriculum reasoning
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-light)',
              padding: '4px',
            }}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Target Activity Summary */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'var(--surface-muted)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.04em' }}>
              Selected Activity
            </div>
            <div style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--text-main)', marginTop: '2px' }}>
              {recommendation.title}
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {recommendation.description}
            </div>
          </div>

          {/* Prerequisite Path Visual */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px' }}>
              Prerequisite Mastery Chain
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {path.map((step, idx) => (
                <div
                  key={step.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: step.isTarget
                      ? 'rgba(59, 130, 246, 0.08)'
                      : step.isWeakest
                      ? 'rgba(245, 158, 11, 0.08)'
                      : 'var(--surface)',
                    border: step.isTarget
                      ? '1px solid var(--primary-border)'
                      : step.isWeakest
                      ? '1px solid var(--warning-border)'
                      : '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: 'var(--surface-muted)',
                        fontSize: '11px',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                        {step.name}
                      </div>
                      {step.isWeakest && (
                        <div style={{ fontSize: '11px', color: '#FBBF24', fontWeight: '600', marginTop: '1px' }}>
                          Weakest prerequisite bottleneck
                        </div>
                      )}
                      {step.isTarget && (
                        <div style={{ fontSize: '11px', color: '#60A5FA', fontWeight: '600', marginTop: '1px' }}>
                          Target recommended concept
                        </div>
                      )}
                    </div>
                  </div>

                  <MasteryBadge score={step.score} size="sm" />
                </div>
              ))}
            </div>
          </div>

          {/* Plain Language Rationale */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'var(--surface-subtle)',
              border: '1px solid var(--border)',
              fontSize: '12.5px',
              lineHeight: '1.55',
              color: 'var(--text-muted)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)', fontWeight: '600', marginBottom: '4px' }}>
              <Sparkles size={14} color="var(--primary)" />
              <span>Adaptive Reasoning</span>
            </div>
            {recommendation.reasoning || (
              <>
                Your overall comprehension of <strong>Hash Tables is currently 48% (Developing)</strong>. Recent quiz attempts indicate error patterns clustering around hash collision handling, where prerequisite concept <strong>Hash Functions (52%)</strong> is the primary bottleneck. Practicing this diagnostic activity strengthens the prerequisite graph before advancing to complex graph structures.
              </>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border)',
            background: 'var(--surface-muted)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button type="button" className="btn-secondary" onClick={onClose} style={{ padding: '7px 14px' }}>
            Dismiss
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              onClose();
              if (onStartActivity) onStartActivity();
            }}
            style={{ padding: '7px 16px' }}
          >
            <span>Start This Activity</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default WhyThisModal;
