import React, { useEffect, useRef } from 'react';
import { ArrowRight, X, Sparkles, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import MasteryChip from '../common/MasteryChip';
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
        style={{
          maxWidth: '560px',
          width: '100%',
          outline: 'none',
          borderRadius: '20px',
          border: '1px solid var(--border-hairline)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid var(--border-hairline)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'var(--coral-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--coral)',
              }}
            >
              <Layers size={18} strokeWidth={1.5} />
            </div>
            <div>
              <h2 id="why-this-title" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                Why This Recommendation?
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', margin: 0 }}>
                Evidence-based adaptive curriculum reasoning
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="icon-btn-circle"
            style={{ width: '32px', height: '32px' }}
            aria-label="Close dialog"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Target Activity Summary */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '14px',
              background: 'var(--surface-muted)',
              border: '1px solid var(--border-hairline)',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em' }}>
              Selected Activity
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
              {recommendation.title}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {recommendation.description}
            </div>
          </div>

          {/* Prerequisite Path Visual */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
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
                    borderRadius: '12px',
                    background: step.isTarget ? 'var(--coral-soft)' : 'var(--surface-muted)',
                    border: step.isTarget
                      ? '1px solid var(--coral)'
                      : '1px solid var(--border-hairline)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: step.isTarget ? 'var(--coral)' : 'var(--surface)',
                        fontSize: '11px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: step.isTarget ? '#FFFFFF' : 'var(--text-secondary)',
                        border: step.isTarget ? 'none' : '1px solid var(--border-hairline)',
                      }}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                        {step.name}
                      </div>
                      {step.isWeakest && (
                        <div style={{ fontSize: '11px', color: 'var(--mastery-developing)', fontWeight: 500, marginTop: '1px' }}>
                          Primary prerequisite bottleneck (52%)
                        </div>
                      )}
                      {step.isTarget && (
                        <div style={{ fontSize: '11px', color: 'var(--coral)', fontWeight: 500, marginTop: '1px' }}>
                          Target recommended concept
                        </div>
                      )}
                    </div>
                  </div>

                  <MasteryChip score={step.score} size="sm" />
                </div>
              ))}
            </div>
          </div>

          {/* Plain Language Rationale */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '14px',
              background: 'var(--surface-muted)',
              border: '1px solid var(--border-hairline)',
              fontSize: '13px',
              lineHeight: '1.5',
              color: 'var(--text-secondary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)', fontWeight: 600, marginBottom: '4px' }}>
              <Sparkles size={14} strokeWidth={1.5} color="var(--coral)" />
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
            padding: '14px 22px',
            borderTop: '1px solid var(--border-hairline)',
            background: 'var(--surface)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button type="button" className="btn-ghost-pill btn-compact" onClick={onClose}>
            Dismiss
          </button>
          <button
            type="button"
            className="btn-coral-pill btn-compact"
            onClick={() => {
              onClose();
              if (onStartActivity) onStartActivity();
            }}
          >
            <span>Start Activity</span>
            <ArrowRight size={13} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default WhyThisModal;
