import React from 'react';
import { Layers, Clock, Cpu, CheckCircle2, AlertCircle } from 'lucide-react';
import Chip from '../common/Chip';

export function ProblemStatementPanel({ assessment }) {
  if (!assessment) return null;

  const difficultyVariant =
    assessment.difficulty === 'Hard'
      ? 'danger'
      : assessment.difficulty === 'Medium'
      ? 'warning'
      : 'success';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        padding: '24px',
        background: 'var(--surface)',
        borderRadius: '20px',
        border: '1px solid var(--border-hairline)',
        boxShadow: 'var(--shadow-card)',
        overflowY: 'auto',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Title & Metadata Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em' }}>
              {assessment.concept || assessment.conceptName || 'Algorithmic Assessment'}
            </span>
            <Chip variant={difficultyVariant} size="sm">
              {assessment.difficulty}
            </Chip>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <Clock size={13} strokeWidth={1.5} />
            <span>{assessment.timeLimitMs ? `${assessment.timeLimitMs}ms` : '2000ms'}</span>
            <span>&bull;</span>
            <Cpu size={13} strokeWidth={1.5} />
            <span>{assessment.memoryLimitMb ? `${assessment.memoryLimitMb}MB` : '256MB'}</span>
          </div>
        </div>

        <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '-0.01em', margin: 0 }}>
          {typeof assessment.title === 'string' ? assessment.title : 'Algorithmic Coding Challenge'}
        </h1>
      </div>

      {/* Description / Problem Statement */}
      <div>
        <div style={{ fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em', marginBottom: '6px' }}>
          Problem Description & Objectives
        </div>
        <div style={{ fontSize: '13.5px', color: 'var(--text-main)', lineHeight: '1.65', margin: 0, whiteSpace: 'pre-wrap' }}>
          {(() => {
            const desc = assessment.problemStatement || assessment.description || assessment.prompt;
            if (!desc) return 'Implement the required algorithmic solution.';
            if (typeof desc === 'string') return desc;
            if (typeof desc === 'object') {
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {desc.prompt && <div>{String(desc.prompt)}</div>}
                  {desc.description && <div>{String(desc.description)}</div>}
                  {desc.objectives && (
                    <div>
                      <strong>Objectives:</strong> {Array.isArray(desc.objectives) ? desc.objectives.join(', ') : String(desc.objectives)}
                    </div>
                  )}
                  {desc.instructions && <div>{String(desc.instructions)}</div>}
                  {!desc.prompt && !desc.description && (
                    <div>{Object.entries(desc).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' | ')}</div>
                  )}
                </div>
              );
            }
            return String(desc);
          })()}
        </div>
      </div>

      {/* Rubric Criteria if provided */}
      {(assessment.rubric || (typeof assessment.prompt === 'object' && assessment.prompt?.rubric)) && (
        <div style={{ background: 'var(--surface-muted)', borderRadius: '12px', padding: '12px 14px', border: '1px solid var(--border-hairline)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', marginBottom: '6px' }}>
            Grading Rubric & Invariant Criteria
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            {(() => {
              const r = assessment.rubric || assessment.prompt?.rubric;
              if (typeof r === 'string') return r;
              if (Array.isArray(r)) {
                return (
                  <ul style={{ margin: 0, paddingLeft: '18px' }}>
                    {r.map((crit, idx) => (
                      <li key={idx} style={{ marginBottom: '4px' }}>
                        <strong>{crit.criterion || crit.name || `Criterion ${idx + 1}`}:</strong> {crit.description || crit.desc || ''} {crit.points ? `(${crit.points} pts)` : ''}
                      </li>
                    ))}
                  </ul>
                );
              }
              if (typeof r === 'object' && r !== null) {
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {Object.entries(r).map(([k, v]) => (
                      <div key={k}>
                        <strong style={{ textTransform: 'capitalize' }}>{k}:</strong> {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                      </div>
                    ))}
                  </div>
                );
              }
              return 'Evaluates invariant preservation, complexity bounds, and edge case resilience.';
            })()}
          </div>
        </div>
      )}

      {/* Input / Output Format */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div style={{ background: 'var(--surface-muted)', borderRadius: '12px', padding: '12px 14px', border: '1px solid var(--border-hairline)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', marginBottom: '4px' }}>
            Input Format
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            {typeof assessment.inputFormat === 'string' ? assessment.inputFormat : 'Read parameters from stdin or function signature.'}
          </div>
        </div>

        <div style={{ background: 'var(--surface-muted)', borderRadius: '12px', padding: '12px 14px', border: '1px solid var(--border-hairline)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', marginBottom: '4px' }}>
            Output Format
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            {typeof assessment.outputFormat === 'string' ? assessment.outputFormat : 'Return the computed result matching constraints.'}
          </div>
        </div>
      </div>

      {/* Constraints */}
      <div>
        <div style={{ fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em', marginBottom: '6px' }}>
          Constraints & Invariant Guarantees
        </div>
        <div
          style={{
            background: 'var(--surface-muted)',
            borderRadius: '12px',
            padding: '12px 14px',
            border: '1px solid var(--border-hairline)',
            fontSize: '12.5px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-main)',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
          }}
        >
          {typeof assessment.constraints === 'string'
            ? assessment.constraints
            : Array.isArray(assessment.constraints)
            ? assessment.constraints.join('\n')
            : '1 <= N <= 10^5\nAll element values fit within standard signed 32-bit integer limits.'}
        </div>
      </div>

      {/* Sample Examples */}
      {assessment.examples && assessment.examples.length > 0 && (
        <div>
          <div style={{ fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em', marginBottom: '8px' }}>
            Sample Test Cases
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {assessment.examples.map((ex, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--surface-muted)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  border: '1px solid var(--border-hairline)',
                  fontSize: '12.5px',
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Example {idx + 1}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '4px', fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Input:</span>
                  <span style={{ color: 'var(--text-main)' }}>{ex.input || 'N/A'}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>Output:</span>
                  <span style={{ color: 'var(--coral)', fontWeight: 600 }}>{ex.output || 'N/A'}</span>
                </div>
                {ex.explanation && (
                  <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    Explanation: {ex.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assessment Instructions */}
      <div style={{ marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid var(--border-hairline)', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
        <strong>Execution Policy:</strong> Clicking <em>Run</em> tests against sample assertions. Clicking <em>Submit</em> grades against full server-side hidden suites and records your solution for AI Viva Defense.
      </div>
    </div>
  );
}

export default ProblemStatementPanel;
