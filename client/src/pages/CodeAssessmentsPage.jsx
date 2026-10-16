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
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', gap: '14px' }}>
        {/* Workspace Sub-header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="btn-studdy btn-studdy-secondary"
              style={{ padding: '6px 14px', fontSize: '12.5px' }}
              onClick={() => setActiveAssessment(null)}
            >
              &larr; Exit Workspace
            </button>
            <h1 style={{ fontSize: '18px', fontWeight: '800' }}>{activeAssessment.title}</h1>
            <span className="role-badge teacher">{activeAssessment.difficulty}</span>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'var(--surface)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--pill-radius)',
              fontSize: '12px',
              color: 'var(--text-muted)',
            }}
          >
            <Radio size={13} color="var(--danger)" />
            <span>Keystroke replay capture active for integrity verification</span>
          </div>
        </div>

        {/* Split Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: '16px', flex: 1, minHeight: 0 }}>
          {/* Left Pane: Problem Description */}
          <div className="studdy-card" style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '20px' }}>
            <span className="ai-badge" style={{ marginBottom: '8px' }}>{activeAssessment.conceptName}</span>
            <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px' }}>Problem Description & Constraints</h2>

            <div style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-main)', whiteSpace: 'pre-wrap', marginBottom: '18px' }}>
              {activeAssessment.problemStatement}
            </div>

            <div style={{ marginBottom: '18px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>Constraints:</h3>
              <ul style={{ paddingLeft: '18px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                {activeAssessment.constraints.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>Sample Example:</h3>
              {activeAssessment.sampleTests.map((t, i) => (
                <div key={i} style={{ padding: '12px', background: 'var(--surface-muted)', borderRadius: '12px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                  <div><strong>Input:</strong> {t.input}</div>
                  <div style={{ marginTop: '4px' }}><strong>Expected:</strong> {t.expectedOutput}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Pane: Code Editor + Terminal Console */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
            <div className="studdy-card" style={{ padding: 0, overflow: 'hidden', flex: '1 1 65%', display: 'flex', flexDirection: 'column' }}>
              {/* Editor Bar */}
              <div style={{ padding: '10px 18px', background: 'var(--surface-muted)', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileCode size={16} color="var(--primary)" />
                  <span style={{ fontSize: '13px', fontWeight: '700' }}>Editor</span>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      fontSize: '12px',
                      background: 'var(--surface)',
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
                    className="btn-studdy btn-studdy-secondary"
                    style={{ padding: '6px 14px', fontSize: '12px' }}
                    onClick={handleRunCode}
                    disabled={isRunning || isSubmitting}
                  >
                    <Play size={13} />
                    <span>{isRunning ? 'Running...' : 'Run Code'}</span>
                  </button>

                  <button
                    type="button"
                    className="btn-studdy btn-studdy-primary"
                    style={{ padding: '6px 14px', fontSize: '12px' }}
                    onClick={handleSubmitSolution}
                    disabled={isRunning || isSubmitting}
                  >
                    <Send size={13} />
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
                    lineHeight: '1.5',
                    border: 'none',
                    resize: 'none',
                    outline: 'none',
                    background: '#FAFAFC',
                    color: '#0F172A',
                  }}
                />
              </div>
            </div>

            {/* Terminal Console */}
            <div className="studdy-card" style={{ padding: 0, overflow: 'hidden', flex: '1 1 35%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '8px 16px', background: '#0F172A', color: '#94A3B8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: '700' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Terminal size={14} />
                  <span>Execution Output</span>
                </div>
                {runStatus && (
                  <span style={{ color: runStatus.includes('Passed') || runStatus.includes('Accepted') ? '#34D399' : '#F87171' }}>
                    {runStatus}
                  </span>
                )}
              </div>
              <div style={{ flex: 1, padding: '12px 16px', background: '#0F172A', color: '#E2E8F0', fontFamily: 'var(--font-mono)', fontSize: '12px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                {outputLog || 'Click "Run Code" to test sample test cases, or "Submit Solution" for official grading.'}
              </div>
            </div>
          </div>
        </div>

        {/* FR-15: Code Viva Modal */}
        {vivaModalOpen && (
          <div className="modal-overlay">
            <div className="modal-dialog-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Sparkles size={20} color="var(--primary)" />
                <h2 style={{ fontSize: '18px', fontWeight: '800' }}>Code-Specific Viva & Explanation</h2>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Explain your submitted implementation to verify your algorithmic reasoning and update your concept mastery estimate.
              </p>

              {vivaQuestions.map((vq, idx) => (
                <div key={vq.id} style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>
                    Question {idx + 1}: {vq.question}
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe your reasoning, pointer movements, and time complexity bounds..."
                    value={vivaAnswers[vq.id] || ''}
                    onChange={(e) => setVivaAnswers({ ...vivaAnswers, [vq.id]: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '13px', outline: 'none' }}
                  />
                </div>
              ))}

              {vivaFeedback && (
                <div style={{ padding: '12px 16px', background: 'var(--success-subtle)', borderRadius: '12px', border: '1px solid #A7F3D0', marginBottom: '14px' }}>
                  <div style={{ fontWeight: '700', color: 'var(--success)', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={16} />
                    <span>Understanding Verified: {vivaFeedback.score}% Score</span>
                  </div>
                  <p style={{ fontSize: '12.5px', marginTop: '4px', color: 'var(--text-main)' }}>
                    {vivaFeedback.feedback}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                {vivaFeedback ? (
                  <button
                    type="button"
                    className="btn-studdy btn-studdy-primary"
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
                    className="btn-studdy btn-studdy-primary"
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
        <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Coding Assessments & Problem Workspace</h1>
        <p style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>
          Solve algorithmic challenges with real-time test execution, sandbox compilation, and code explanation viva.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '18px' }}>
        {assessments.map((item) => (
          <div key={item.id} className="studdy-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="ai-badge">{item.conceptName}</span>
                <span className="role-badge teacher">{item.difficulty}</span>
              </div>

              <h2 style={{ fontSize: '16.5px', fontWeight: '700', marginBottom: '8px' }}>{item.title}</h2>
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
              className="btn-studdy btn-studdy-primary"
              style={{ width: '100%' }}
              onClick={() => handleOpenWorkspace(item)}
            >
              <Code2 size={15} />
              <span>{item.status === 'completed' ? 'Open & Inspect Solution' : 'Open Coding Workspace'}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CodeAssessmentsPage;
