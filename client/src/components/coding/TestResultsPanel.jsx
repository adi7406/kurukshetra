import React, { useState } from 'react';
import { Terminal, CheckCircle2, XCircle, Clock, Cpu, Play, Sparkles } from 'lucide-react';
import Chip from '../common/Chip';

export function TestResultsPanel({
  runStatus,
  outputLog,
  sampleTests = [],
  submissionResult = null,
  customInput,
  onCustomInputChange,
  onRunCustom,
  isRunningCustom = false,
  onOpenReasoning,
}) {
  const [activeTab, setActiveTab] = useState('samples'); // 'samples' | 'custom' | 'submission'

  const hasSubmission = !!submissionResult;

  return (
    <div
      style={{
        borderRadius: '20px',
        border: '1px solid var(--border-hairline)',
        boxShadow: 'var(--shadow-card)',
        background: 'var(--surface)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Result Tabs Bar */}
      <div
        style={{
          padding: '8px 16px',
          background: 'var(--surface-muted)',
          borderBottom: '1px solid var(--border-hairline)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('samples')}
            style={{
              padding: '5px 14px',
              borderRadius: 'var(--radius-pill)',
              border: 'none',
              background: activeTab === 'samples' ? 'var(--surface)' : 'transparent',
              color: activeTab === 'samples' ? 'var(--text-main)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'samples' ? 600 : 500,
              fontSize: '12.5px',
              cursor: 'pointer',
              boxShadow: activeTab === 'samples' ? 'var(--shadow-sm)' : 'none',
            }}
          >
            Sample Test Cases
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            style={{
              padding: '5px 14px',
              borderRadius: 'var(--radius-pill)',
              border: 'none',
              background: activeTab === 'custom' ? 'var(--surface)' : 'transparent',
              color: activeTab === 'custom' ? 'var(--text-main)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'custom' ? 600 : 500,
              fontSize: '12.5px',
              cursor: 'pointer',
              boxShadow: activeTab === 'custom' ? 'var(--shadow-sm)' : 'none',
            }}
          >
            Custom Input
          </button>

          {hasSubmission && (
            <button
              type="button"
              onClick={() => setActiveTab('submission')}
              style={{
                padding: '5px 14px',
                borderRadius: 'var(--radius-pill)',
                border: 'none',
                background: activeTab === 'submission' ? 'var(--coral-soft)' : 'transparent',
                color: activeTab === 'submission' ? 'var(--coral)' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '12.5px',
                cursor: 'pointer',
              }}
            >
              Submission Outcome
            </button>
          )}
        </div>

        {runStatus && (
          <Chip
            variant={
              runStatus.includes('Pass') || runStatus === 'Accepted'
                ? 'success'
                : 'danger'
            }
            size="sm"
          >
            {runStatus}
          </Chip>
        )}
      </div>

      {/* Tab 1: Sample Tests */}
      {activeTab === 'samples' && (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sampleTests.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', padding: '16px' }}>
              No sample test cases specified. Click "Run Code" to execute test assertions.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
              {sampleTests.map((st, i) => (
                <div
                  key={i}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'var(--surface-muted)',
                    border: '1px solid var(--border-hairline)',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Case {i + 1}</span>
                    <span style={{ color: 'var(--mastery-solid)', fontSize: '11px', fontWeight: 600 }}>Public</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Input: </span>
                      <span style={{ color: 'var(--text-main)' }}>{st.input || 'N/A'}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Expected: </span>
                      <span style={{ color: 'var(--coral)', fontWeight: 600 }}>{st.expectedOutput || st.output || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {outputLog && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Console Execution Log
              </div>
              <pre
                style={{
                  background: '#16161A',
                  color: '#ECEAE8',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  maxHeight: '160px',
                  overflowY: 'auto',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {outputLog}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Custom Input */}
      {activeTab === 'custom' && (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
              Standard Input (stdin)
            </label>
            <textarea
              value={customInput || ''}
              onChange={(e) => onCustomInputChange && onCustomInputChange(e.target.value)}
              placeholder="Enter custom input arguments here..."
              style={{
                width: '100%',
                minHeight: '70px',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border-hairline)',
                background: 'var(--surface-muted)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12.5px',
                color: 'var(--text-main)',
                resize: 'vertical',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onRunCustom}
              disabled={isRunningCustom}
              className="btn-coral-pill btn-compact"
            >
              <Play size={12} strokeWidth={2} />
              <span>{isRunningCustom ? 'Executing Custom...' : 'Run Custom Input'}</span>
            </button>
          </div>

          {outputLog && (
            <div style={{ marginTop: '4px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Standard Output
              </div>
              <pre
                style={{
                  background: '#16161A',
                  color: '#ECEAE8',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  maxHeight: '160px',
                  overflowY: 'auto',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {outputLog}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Official Submission Results */}
      {activeTab === 'submission' && hasSubmission && (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em' }}>
                Isolated Sandbox Evaluation
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-main)', margin: '2px 0 0 0' }}>
                Outcome: {submissionResult.status || 'Graded'}
              </h3>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <Clock size={13} />
                <span>{submissionResult.runtimeMs || 35}ms</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <Cpu size={13} />
                <span>{submissionResult.memoryMb || 12.8}MB</span>
              </div>
            </div>
          </div>

          <div style={{ padding: '12px 16px', background: 'var(--surface-muted)', borderRadius: '12px', border: '1px solid var(--border-hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-main)' }}>
              Tests Passed: <strong>{submissionResult.testsPassed || 0} / {submissionResult.totalTests || 18}</strong>
            </span>
            <Chip variant={submissionResult.success || submissionResult.status === 'Accepted' ? 'success' : 'danger'} size="sm">
              {submissionResult.success || submissionResult.status === 'Accepted' ? '100% Passed' : 'Test Failures'}
            </Chip>
          </div>

          {onOpenReasoning && (
            <button
              type="button"
              className="btn-coral-pill"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={onOpenReasoning}
            >
              <Sparkles size={14} strokeWidth={2} />
              <span>Complete AI Viva Defense & Invariant Explanation</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default TestResultsPanel;
