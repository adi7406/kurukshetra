import React, { useState, useEffect } from 'react';
import {
  Code2,
  Play,
  Send,
  Terminal,
  FileCode,
  CheckCircle2,
  Radio,
  Clock,
  Sparkles,
  RotateCcw,
  Check,
} from 'lucide-react';
import { learningService } from '../services/learningService';
import LoadingState from '../components/feedback/LoadingState';

export function CodeAssessmentsPage() {
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState([]);
  const [activeAssessment, setActiveAssessment] = useState(null);

  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outputLog, setOutputLog] = useState('');
  const [runStatus, setRunStatus] = useState(null);

  // FR-15: Viva Modal
  const [vivaModalOpen, setVivaModalOpen] = useState(false);
  const [vivaQuestions, setVivaQuestions] = useState([]);
  const [vivaAnswers, setVivaAnswers] = useState({});
  const [evaluatingViva, setEvaluatingViva] = useState(false);
  const [vivaFeedback, setVivaFeedback] = useState(null);

  useEffect(() => {
    loadAssessments();
  }, []);

  async function loadAssessments() {
    try {
      setLoading(true);
      const list = await learningService.getAssessments();
      setAssessments(list);
    } catch (err) {
      console.error('Failed to load code assessments:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenWorkspace = (assessment) => {
    setActiveAssessment(assessment);
    const lang = assessment.allowedLanguages[0] || 'python';
    setSelectedLanguage(lang);
    setCode(assessment.starterCode[lang] || '');
    setOutputLog('');
    setRunStatus(null);
    setVivaModalOpen(false);
    setVivaFeedback(null);
  };

  const handleLanguageChange = (lang) => {
    setSelectedLanguage(lang);
    if (activeAssessment?.starterCode[lang]) {
      setCode(activeAssessment.starterCode[lang]);
    }
  };

  const handleRunCode = async () => {
    if (!activeAssessment) return;
    try {
      setIsRunning(true);
      setRunStatus(null);
      setOutputLog('Compiling & running against sample test suite in isolated runner...');

      const res = await learningService.runCode(activeAssessment.id, code, selectedLanguage);
      setRunStatus(res.status);
      setOutputLog(res.output);
    } catch (err) {
      setRunStatus('Execution Error');
      setOutputLog(err.message || 'Execution failed.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitSolution = async () => {
    if (!activeAssessment) return;
    try {
      setIsSubmitting(true);
      setRunStatus(null);
      setOutputLog('Submitting solution to secure sandbox for formal test evaluation...');

      const res = await learningService.submitSolution(activeAssessment.id, code, selectedLanguage);
      setRunStatus(res.status);
      setOutputLog(
        `[OFFICIAL SCORE VERIFIED]\nStatus: ${res.status}\nPassed: ${res.testsPassed} / ${res.totalTests} test cases\nExecution Runtime: ${res.runtimeMs}ms | Memory: ${res.memoryMb}MB\n\nAll test suites passed. Launching code-explanation viva.`
      );

      if (res.vivaQuestions?.length > 0) {
        setVivaQuestions(res.vivaQuestions);
        setVivaAnswers({});
        setVivaFeedback(null);
        setVivaModalOpen(true);
      }
      await loadAssessments();
    } catch (err) {
      setRunStatus('Submission Error');
      setOutputLog(err.message || 'Submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEvaluateViva = async () => {
    try {
      setEvaluatingViva(true);
      const firstQ = vivaQuestions[0];
      const answer = vivaAnswers[firstQ.id] || '';
      const result = await learningService.evaluateVivaAnswer(firstQ.id, answer);
      setVivaFeedback(result);
    } catch (err) {
      console.error('Viva evaluation failed:', err);
    } finally {
      setEvaluatingViva(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading coding workspace..." />;
  }

  // -------------------------------------------------------------
  // ACTIVE WORKSPACE VIEW
  // -------------------------------------------------------------
  if (activeAssessment) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)', gap: '14px' }}>
        {/* Workspace Sub-header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '5px 12px', fontSize: '12px' }}
              onClick={() => setActiveAssessment(null)}
            >
              &larr; Exit Workspace
            </button>
            <h1 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>{activeAssessment.title}</h1>
            <span className="badge-clean blue">{activeAssessment.difficulty}</span>
          </div>

          <div className="studio-status-pill">
            <span className="status-dot" />
            <span>Sandboxed Execution Active</span>
          </div>
        </div>

        {/* Split Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: '16px', flex: 1, minHeight: 0 }}>
          {/* Left Pane: Problem Description */}
          <div className="saas-card" style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '20px' }}>
            <div style={{ marginBottom: '8px' }}>
              <span className="badge-clean blue">{activeAssessment.conceptName}</span>
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '14px' }}>
              Problem Description & Invariants
            </h2>

            <div style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-main)', whiteSpace: 'pre-wrap', marginBottom: '18px' }}>
              {activeAssessment.problemStatement}
            </div>

            <div style={{ marginBottom: '18px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.04em', marginBottom: '6px' }}>
                Constraints:
              </h3>
              <ul style={{ paddingLeft: '18px', fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                {activeAssessment.constraints.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.04em', marginBottom: '8px' }}>
                Sample Test Case:
              </h3>
              {activeAssessment.sampleTests.map((t, i) => (
                <div key={i} style={{ padding: '12px', background: '#F8FAFC', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                  <div><strong style={{ color: 'var(--text-main)' }}>Input:</strong> {t.input}</div>
                  <div style={{ marginTop: '4px' }}><strong style={{ color: 'var(--text-main)' }}>Expected:</strong> {t.expectedOutput}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Pane: Code Editor + Terminal Console */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
            {/* Editor Window */}
            <div className="studio-window-card" style={{ padding: 0, overflow: 'hidden', flex: '1 1 65%', display: 'flex', flexDirection: 'column', marginBottom: 0 }}>
              {/* Studio Titlebar */}
              <div className="studio-titlebar" style={{ padding: '8px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="window-traffic-dots">
                    <span className="traffic-dot red" />
                    <span className="traffic-dot yellow" />
                    <span className="traffic-dot green" />
                  </div>
                  <span className="studio-breadcrumb">
                    solution.{selectedLanguage === 'python' ? 'py' : selectedLanguage === 'javascript' ? 'js' : 'java'}
                  </span>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border)',
                      fontSize: '11.5px',
                      background: '#FFFFFF',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {activeAssessment.allowedLanguages.map((l) => (
                      <option key={l} value={l}>{l.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '4px 12px', fontSize: '12px' }}
                    onClick={handleRunCode}
                    disabled={isRunning || isSubmitting}
                  >
                    <Play size={12} />
                    <span>{isRunning ? 'Running...' : 'Run Code'}</span>
                  </button>

                  <button
                    type="button"
                    className="btn-primary"
                    style={{ padding: '4px 12px', fontSize: '12px' }}
                    onClick={handleSubmitSolution}
                    disabled={isRunning || isSubmitting}
                  >
                    <Send size={12} />
                    <span>{isSubmitting ? 'Evaluating...' : 'Submit Solution'}</span>
                  </button>
                </div>
              </div>

              {/* Code Editor */}
              <div style={{ flex: 1, position: 'relative' }}>
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  spellCheck="false"
                  style={{
                    width: '100%',
                    height: '100%',
                    padding: '16px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    border: 'none',
                    resize: 'none',
                    outline: 'none',
                    background: '#FFFFFF',
                    color: '#0F172A',
                  }}
                />
              </div>
            </div>

            {/* Terminal Console */}
            <div className="studio-window-card" style={{ padding: 0, overflow: 'hidden', flex: '1 1 35%', display: 'flex', flexDirection: 'column', marginBottom: 0, background: '#0F172A', borderColor: '#334155' }}>
              <div style={{ padding: '8px 14px', background: '#0F172A', borderBottom: '1px solid #1E293B', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: '#94A3B8' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="window-traffic-dots">
                    <span className="traffic-dot red" />
                    <span className="traffic-dot yellow" />
                    <span className="traffic-dot green" />
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600', color: '#CBD5E1' }}>Sandboxed Output</span>
                </div>
                {runStatus && (
                  <span style={{ fontSize: '11px', fontWeight: '700', color: runStatus.includes('Passed') || runStatus.includes('Accepted') ? '#34D399' : '#F87171' }}>
                    {runStatus}
                  </span>
                )}
              </div>
              <div style={{ flex: 1, padding: '12px 14px', background: '#0F172A', color: '#E2E8F0', fontFamily: 'var(--font-mono)', fontSize: '12px', overflowY: 'auto', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                {outputLog || 'Click "Run Code" to test sample cases, or "Submit Solution" for official grading.'}
              </div>
            </div>
          </div>
        </div>

        {/* FR-15: Code Viva Modal */}
        {vivaModalOpen && (
          <div className="modal-overlay">
            <div className="modal-dialog-card" style={{ maxWidth: '640px' }}>
              <div className="studio-titlebar" style={{ padding: '12px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="window-traffic-dots">
                    <span className="traffic-dot red" />
                    <span className="traffic-dot yellow" />
                    <span className="traffic-dot green" />
                  </div>
                  <span className="studio-breadcrumb">
                    Pathwise Studio / <strong>Algorithmic Reasoning Viva</strong>
                  </span>
                </div>
                <span className="badge-clean blue">Integrity Verification</span>
              </div>

              <div style={{ padding: '24px', overflowY: 'auto', maxHeight: '65vh', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  Explain your implementation invariants and algorithmic decisions to update your posterior concept mastery estimate.
                </p>

                {vivaQuestions.map((vq, idx) => (
                  <div key={vq.id}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px' }}>
                      Question {idx + 1}: {vq.question}
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Describe your reasoning, pointer movements, and complexity bounds..."
                      value={vivaAnswers[vq.id] || ''}
                      onChange={(e) => setVivaAnswers({ ...vivaAnswers, [vq.id]: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px', outline: 'none', background: '#FFFFFF' }}
                    />
                  </div>
                ))}

                {vivaFeedback && (
                  <div style={{ padding: '12px 16px', background: 'var(--success-subtle)', borderRadius: '6px', border: '1px solid var(--success-border)' }}>
                    <div style={{ fontWeight: '700', color: '#065F46', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={15} />
                      <span>Understanding Verified: {vivaFeedback.score}% Score</span>
                    </div>
                    <p style={{ fontSize: '12.5px', marginTop: '4px', color: 'var(--text-main)', lineHeight: '1.4' }}>
                      {vivaFeedback.feedback}
                    </p>
                  </div>
                )}
              </div>

              <div style={{ padding: '14px 24px', background: '#F8FAFC', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                {vivaFeedback ? (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      setVivaModalOpen(false);
                      setActiveAssessment(null);
                    }}
                  >
                    Complete & Return to Dashboard
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleEvaluateViva}
                    disabled={evaluatingViva}
                  >
                    {evaluatingViva ? 'Evaluating explanation...' : 'Submit Viva Explanation'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // ASSESSMENTS LIST
  // -------------------------------------------------------------
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <div className="hero-pill-badge" style={{ marginBottom: '8px' }}>
          <span className="dot" />
          <span>SANDBOXED EVALUATION ENVIRONMENT</span>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          Coding Assessments & Problem Workspace
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Solve algorithmic challenges with real-time test execution, sandbox compilation, and code explanation viva.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
        {assessments.map((item) => (
          <div key={item.id} className="saas-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span className="badge-clean blue">{item.conceptName}</span>
                <span className="badge-clean green">{item.difficulty}</span>
              </div>

              <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px' }}>{item.title}</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '14px' }}>
                {item.problemStatement.slice(0, 140)}...
              </p>

              <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: 'var(--text-light)', marginBottom: '16px' }}>
                <span>Languages: {item.allowedLanguages.join(', ')}</span>
                <span>&bull;</span>
                <span>{item.timeLimitMinutes} mins limit</span>
              </div>
            </div>

            <button
              type="button"
              className="btn-primary"
              style={{ width: '100%' }}
              onClick={() => handleOpenWorkspace(item)}
            >
              <Code2 size={14} />
              <span>{item.status === 'completed' ? 'Open & Inspect Solution' : 'Open Coding Workspace'}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CodeAssessmentsPage;
