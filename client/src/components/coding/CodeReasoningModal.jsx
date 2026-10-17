import React, { useState } from 'react';
import { X, Sparkles, CheckCircle2, MessageSquare, AlertCircle } from 'lucide-react';
import Chip from '../common/Chip';

export function CodeReasoningModal({
  isOpen,
  onClose,
  submissionId,
  vivaQuestion,
  onSubmitReasoning,
  isEvaluating = false,
  feedback = null,
}) {
  const [approach, setApproach] = useState('');
  const [invariants, setInvariants] = useState('');
  const [complexity, setComplexity] = useState('');
  const [edgeCases, setEdgeCases] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const fullExplanation = [
      `[Algorithm & Approach]: ${approach.trim()}`,
      `[Why Approach Works / Invariants]: ${invariants.trim()}`,
      `[Computational Complexity]: ${complexity.trim()}`,
      `[Edge Cases & Trade-offs]: ${edgeCases.trim()}`,
    ].join('\n\n');

    onSubmitReasoning({
      submissionId,
      fullExplanation,
      approach,
      invariants,
      complexity,
      edgeCases,
    });
  };

  const isComplete = Boolean(approach.trim() && complexity.trim());

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog-card animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '680px',
          borderRadius: '20px',
          border: '1px solid var(--border-hairline)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-hairline)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em' }}>
              Phase 6 &bull; Code Explanation & Oral Defense
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-main)', margin: '2px 0 0 0' }}>
              Algorithmic Reasoning & Viva Defense
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="icon-btn-circle"
            style={{ width: '32px', height: '32px' }}
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Prompt banner */}
          <div
            style={{
              padding: '14px 18px',
              background: 'var(--surface-muted)',
              borderRadius: '14px',
              border: '1px solid var(--border-hairline)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--coral)', fontWeight: 600, fontSize: '12px', marginBottom: '4px' }}>
              <Sparkles size={14} />
              <span>Viva Question</span>
            </div>
            <div style={{ fontSize: '13.5px', color: 'var(--text-main)', lineHeight: '1.5' }}>
              {vivaQuestion?.prompt || 'Explain your algorithmic approach, invariant guarantees, and time/space complexity analysis.'}
            </div>
          </div>

          {/* Feedback Card (if evaluated) */}
          {feedback && (
            <div
              style={{
                padding: '18px',
                borderRadius: '16px',
                background: feedback.score >= 70 ? 'var(--mastery-developing-soft)' : 'var(--coral-soft)',
                border: `1.5px solid ${feedback.score >= 70 ? 'var(--mastery-developing)' : 'var(--coral)'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>
                  Rubric Score: <strong>{feedback.score}%</strong>
                </span>
                <Chip variant={feedback.score >= 70 ? 'success' : 'danger'} size="sm">
                  {feedback.score >= 70 ? 'Demonstrated Invariant Comprehension' : 'Needs Elaboration'}
                </Chip>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.5', margin: 0 }}>
                {feedback.feedback}
              </p>
            </div>
          )}

          {/* Reasoning Fields Form */}
          {!feedback && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                  1. Algorithm & Core Strategy
                </label>
                <textarea
                  value={approach}
                  onChange={(e) => setApproach(e.target.value)}
                  placeholder="Describe your step-by-step approach and why you selected this structure..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-hairline)',
                    background: 'var(--surface-muted)',
                    fontFamily: 'inherit',
                    fontSize: '13px',
                    color: 'var(--text-main)',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                  2. Invariant Mechanics (Why does this work correctly?)
                </label>
                <textarea
                  value={invariants}
                  onChange={(e) => setInvariants(e.target.value)}
                  placeholder="Detail loop invariants, pointer integrity, and mathematical guarantees..."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-hairline)',
                    background: 'var(--surface-muted)',
                    fontFamily: 'inherit',
                    fontSize: '13px',
                    color: 'var(--text-main)',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                  3. Computational Complexity Analysis (Time & Space)
                </label>
                <input
                  type="text"
                  value={complexity}
                  onChange={(e) => setComplexity(e.target.value)}
                  placeholder="e.g., Time: O(N) due to single pass; Auxiliary Space: O(1) in-place"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-hairline)',
                    background: 'var(--surface-muted)',
                    fontFamily: 'inherit',
                    fontSize: '13px',
                    color: 'var(--text-main)',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                  4. Edge Cases & Boundary Conditions Considered
                </label>
                <input
                  type="text"
                  value={edgeCases}
                  onChange={(e) => setEdgeCases(e.target.value)}
                  placeholder="e.g., Empty input, single element, negative numbers, duplicates"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-hairline)',
                    background: 'var(--surface-muted)',
                    fontFamily: 'inherit',
                    fontSize: '13px',
                    color: 'var(--text-main)',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn-ghost-pill btn-compact"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isComplete || isEvaluating}
                  className="btn-coral-pill btn-compact"
                >
                  <Sparkles size={13} strokeWidth={2} />
                  <span>{isEvaluating ? 'Evaluating Rubric...' : 'Submit Viva Explanation'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer (when feedback rendered) */}
        {feedback && (
          <div
            style={{
              padding: '14px 24px',
              background: 'var(--surface-muted)',
              borderTop: '1px solid var(--border-hairline)',
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              className="btn-coral-pill btn-compact"
              onClick={onClose}
            >
              Close and Continue Learning
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CodeReasoningModal;
