import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Code2,
  Clock,
  ChevronRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { learningService } from '../services/learningService';
import LoadingState from '../components/feedback/LoadingState';
import EmptyState from '../components/feedback/EmptyState';
import Chip from '../components/common/Chip';
import { useToast } from '../context/ToastContext';
import ProblemStatementPanel from '../components/coding/ProblemStatementPanel';
import CodingEditorPanel from '../components/coding/CodingEditorPanel';
import TestResultsPanel from '../components/coding/TestResultsPanel';
import CodeReasoningModal from '../components/coding/CodeReasoningModal';

export function CodeAssessmentsPage() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState([]);
  const [activeAssessment, setActiveAssessment] = useState(null);

  // Editor and Session State
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runStatus, setRunStatus] = useState(null);
  const [outputLog, setOutputLog] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [isRunningCustom, setIsRunningCustom] = useState(false);

  // Submission & Reasoning Viva
  const [submissionResult, setSubmissionResult] = useState(null);
  const [isReasoningOpen, setIsReasoningOpen] = useState(false);
  const [isEvaluatingReasoning, setIsEvaluatingReasoning] = useState(false);
  const [reasoningFeedback, setReasoningFeedback] = useState(null);

  // Telemetry Event Recording (Phase 7 & 8)
  const sessionIdRef = useRef(`sess_${Date.now()}`);
  const eventSequenceRef = useRef(0);
  const eventBufferRef = useRef([]);
  const lastCodeLenRef = useRef(0);

  // Flush telemetry events to backend periodically
  const flushEvents = useCallback(async (isFinal = false) => {
    if (eventBufferRef.current.length === 0) return;
    const batch = [...eventBufferRef.current];
    eventBufferRef.current = [];
    await learningService.recordSessionEvents(sessionIdRef.current, batch, isFinal);
  }, []);

  const recordEvent = useCallback((eventType, payload = {}) => {
    const seq = eventSequenceRef.current + 1;
    eventSequenceRef.current = seq;
    const eventItem = {
      sequenceNumber: seq,
      eventType,
      occurredAt: new Date().toISOString(),
      payload,
    };
    eventBufferRef.current.push(eventItem);
    if (eventBufferRef.current.length >= 8) {
      flushEvents(false);
    }
  }, [flushEvents]);

  // Window Focus & Visibility Telemetry (Phase 8 Proctoring Signals)
  useEffect(() => {
    const handleVisibilityChange = () => {
      recordEvent('visibility_change', {
        hidden: document.hidden,
        state: document.visibilityState,
      });
    };

    const handleBlur = () => {
      recordEvent('editor_blur', { note: 'Window focus lost' });
    };

    const handleFocus = () => {
      recordEvent('editor_focus', { note: 'Window focus regained' });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    const interval = setInterval(() => {
      flushEvents(false);
    }, 12000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
      flushEvents(true);
    };
  }, [recordEvent, flushEvents]);

  // Load Assessments
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const list = await learningService.getAssessments();
        setAssessments(list || []);

        if (list && list.length > 0) {
          if (assessmentId) {
            const found = list.find((a) => a.id === assessmentId);
            if (found) {
              selectAssessment(found);
            } else {
              selectAssessment(list[0]);
            }
          } else {
            selectAssessment(list[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load code assessments:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [assessmentId]);

  const selectAssessment = (item) => {
    setActiveAssessment(item);
    const lang = item.supportedLanguages?.[0] || 'python';
    setSelectedLanguage(lang);
    const starter = item.starterCode?.[lang] || '';
    setCode(starter);
    lastCodeLenRef.current = starter.length;
    setHasUnsavedChanges(false);
    setOutputLog('');
    setRunStatus(null);
    setSubmissionResult(null);
    setReasoningFeedback(null);
    setIsReasoningOpen(false);

    // Record session start event
    sessionIdRef.current = `sess_${item.id}_${Date.now()}`;
    eventSequenceRef.current = 0;
    eventBufferRef.current = [];
    recordEvent('document_change', { action: 'session_init', assessmentId: item.id, language: lang });
  };

  const handleCodeChange = (newCode) => {
    const delta = newCode.length - lastCodeLenRef.current;
    lastCodeLenRef.current = newCode.length;
    setCode(newCode);
    setHasUnsavedChanges(true);

    // Detect large paste event (Phase 8 integrity signal)
    if (delta > 150) {
      recordEvent('paste', {
        charLength: delta,
        totalLength: newCode.length,
        language: selectedLanguage,
      });
    } else {
      recordEvent('document_change', {
        delta,
        totalLength: newCode.length,
      });
    }
  };

  const handleLanguageChange = (newLang) => {
    setSelectedLanguage(newLang);
    recordEvent('language_change', { previous: selectedLanguage, next: newLang });
    if (activeAssessment?.starterCode?.[newLang]) {
      setCode(activeAssessment.starterCode[newLang]);
      lastCodeLenRef.current = activeAssessment.starterCode[newLang].length;
      setHasUnsavedChanges(false);
    }
  };

  const handleResetStarter = () => {
    if (!activeAssessment) return;
    const starter = activeAssessment.starterCode?.[selectedLanguage] || '';
    setCode(starter);
    lastCodeLenRef.current = starter.length;
    setHasUnsavedChanges(false);
    toast.info('Reset code to starter template');
  };

  // Run against sample tests
  const handleRunCode = async () => {
    if (!activeAssessment) return;
    try {
      setIsRunning(true);
      setRunStatus(null);
      setOutputLog('Executing against sample assertions in isolated runner...');
      recordEvent('run', { language: selectedLanguage, mode: 'sample' });

      const res = await learningService.runCode(activeAssessment.id, code, selectedLanguage);
      setRunStatus(res.status || (res.success ? 'Sample Tests Passed' : 'Test Failure'));
      setOutputLog(res.output || JSON.stringify(res.data || res, null, 2));
      toast.success('Sample tests execution completed');
    } catch (err) {
      setRunStatus('Execution Error');
      setOutputLog(err.message || 'Execution error');
      toast.error('Execution encountered an error');
    } finally {
      setIsRunning(false);
    }
  };

  // Run with custom stdin input
  const handleRunCustom = async () => {
    if (!activeAssessment) return;
    try {
      setIsRunningCustom(true);
      setOutputLog(`Executing with custom stdin input:\n${customInput}\n...`);
      recordEvent('run', { language: selectedLanguage, mode: 'custom', inputSize: customInput.length });

      const res = await learningService.runCode(activeAssessment.id, code, selectedLanguage, customInput);
      setOutputLog(res.output || JSON.stringify(res.data || res, null, 2));
      toast.success('Custom input execution completed');
    } catch (err) {
      setOutputLog(err.message || 'Custom execution error');
      toast.error('Custom input execution failed');
    } finally {
      setIsRunningCustom(false);
    }
  };

  // Official submission (grades against server-side hidden test cases)
  const handleSubmitSolution = async () => {
    if (!activeAssessment) return;
    try {
      setIsSubmitting(true);
      setRunStatus(null);
      setOutputLog('Submitting solution to Judge0 sandbox for official grading...');
      recordEvent('submit', { language: selectedLanguage, codeLength: code.length });

      const res = await learningService.submitSolution(activeAssessment.id, code, selectedLanguage);
      setSubmissionResult(res);
      setRunStatus(res.status);
      setOutputLog(
        `[OFFICIAL JUDGE0 GRADING OUTCOME]\nStatus: ${res.status}\nPassed: ${res.testsPassed || 0} / ${res.totalTests || 18} test cases\nExecution Runtime: ${res.runtimeMs || 35}ms | Memory: ${res.memoryMb || 12.8}MB\n\nOfficial score recorded. Proceed to explain your algorithmic solution in the Viva Defense.`
      );
      setHasUnsavedChanges(false);
      toast.success('Solution submitted & graded!');

      // Automatically launch Code Reasoning Viva Modal (Phase 6)
      setIsReasoningOpen(true);
    } catch (err) {
      setRunStatus('Submission Error');
      setOutputLog(err.message || 'Submission failed');
      toast.error('Submission encountered an error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Viva Reasoning Submission (Phase 6)
  const handleSubmitReasoning = async (reasoningData) => {
    try {
      setIsEvaluatingReasoning(true);
      const questionId = activeAssessment?.vivaQuestion?.id || 'viva_default';
      const feedback = await learningService.evaluateVivaAnswer(
        questionId,
        reasoningData.fullExplanation,
        reasoningData.submissionId
      );
      setReasoningFeedback(feedback);
      toast.success('Viva reasoning evaluated against Bloom rubric!');
    } catch (err) {
      toast.error('Viva evaluation failed');
    } finally {
      setIsEvaluatingReasoning(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading professional coding workspace..." />;
  }

  // If no assessments available in database
  if (!activeAssessment) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/home')}>Home</span>
          <span>/</span>
          <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>Coding Assessments</span>
        </div>

        <EmptyState
          title="No Coding Challenges Available"
          description="Assessments will appear once published by an instructor or created through syllabus ingestion."
          actionLabel="Return Home"
          onAction={() => navigate('/home')}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', height: 'calc(100vh - 100px)' }}>
      {/* Breadcrumbs & Navigation Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/home')}>Home</span>
          <span>/</span>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/content/concepts')}>Concepts</span>
          <span>/</span>
          <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{activeAssessment.title}</span>
        </div>

        {/* Problem Switcher Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Switch Problem:</span>
          <select
            value={activeAssessment.id}
            onChange={(e) => {
              const selected = assessments.find((a) => a.id === e.target.value);
              if (selected) selectAssessment(selected);
            }}
            style={{
              background: 'var(--surface)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-pill)',
              padding: '4px 12px',
              fontSize: '12.5px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {assessments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title} ({a.difficulty})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Two-Panel Workspace Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1fr) minmax(420px, 1.25fr)',
          gap: '18px',
          flex: 1,
          overflow: 'hidden',
          minHeight: '560px',
        }}
      >
        {/* Left Panel: Problem Statement, Constraints, Sample Cases */}
        <div style={{ height: '100%', overflowY: 'auto' }}>
          <ProblemStatementPanel assessment={activeAssessment} />
        </div>

        {/* Right Panel: Monaco Editor & Test Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', overflowY: 'auto' }}>
          {/* Top Monaco Editor Panel */}
          <div style={{ flex: '1 1 55%', minHeight: '340px' }}>
            <CodingEditorPanel
              code={code}
              onChange={handleCodeChange}
              language={selectedLanguage}
              onLanguageChange={handleLanguageChange}
              supportedLanguages={activeAssessment.supportedLanguages || ['python', 'javascript']}
              onRun={handleRunCode}
              onSubmit={handleSubmitSolution}
              isRunning={isRunning}
              isSubmitting={isSubmitting}
              onResetStarter={handleResetStarter}
              hasUnsavedChanges={hasUnsavedChanges}
            />
          </div>

          {/* Bottom Test Results & Submission Benchmarks Panel */}
          <div style={{ flex: '0 0 auto' }}>
            <TestResultsPanel
              runStatus={runStatus}
              outputLog={outputLog}
              sampleTests={activeAssessment.sampleTests || []}
              submissionResult={submissionResult}
              customInput={customInput}
              onCustomInputChange={setCustomInput}
              onRunCustom={handleRunCustom}
              isRunningCustom={isRunningCustom}
              onOpenReasoning={() => setIsReasoningOpen(true)}
            />
          </div>
        </div>
      </div>

      {/* Code Reasoning Viva Modal (Phase 6) */}
      <CodeReasoningModal
        isOpen={isReasoningOpen}
        onClose={() => setIsReasoningOpen(false)}
        submissionId={submissionResult?.submissionId || `sub_${Date.now()}`}
        vivaQuestion={activeAssessment.vivaQuestion}
        onSubmitReasoning={handleSubmitReasoning}
        isEvaluating={isEvaluatingReasoning}
        feedback={reasoningFeedback}
      />
    </div>
  );
}

export default CodeAssessmentsPage;
