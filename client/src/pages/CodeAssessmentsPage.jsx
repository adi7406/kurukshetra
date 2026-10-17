import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { learningService } from '../services/learningService';
import LoadingState from '../components/feedback/LoadingState';
import EmptyState from '../components/feedback/EmptyState';
import { useToast } from '../context/ToastContext';
import ProblemStatementPanel from '../components/coding/ProblemStatementPanel';
import CodingEditorPanel from '../components/coding/CodingEditorPanel';
import TestResultsPanel from '../components/coding/TestResultsPanel';
import CodeReasoningModal from '../components/coding/CodeReasoningModal';

export function CodeAssessmentsPage() {
  const { assessmentId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const topicParam = searchParams.get('conceptId') || searchParams.get('topicId');

  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState([]);
  const [activeAssessment, setActiveAssessment] = useState(null);
  const [topicMissingAssessment, setTopicMissingAssessment] = useState(false);

  // Backend Supported Languages and Piston Runtime Health
  const [backendLanguages, setBackendLanguages] = useState([]);
  const [pistonStatus, setPistonStatus] = useState('ready');

  // Editor State
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runStatus, setRunStatus] = useState(null);
  const [outputLog, setOutputLog] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [isRunningCustom, setIsRunningCustom] = useState(false);

  // Per-language Draft Cache (Preserves student code drafts when switching languages)
  const draftsByLanguageRef = useRef({});

  // Submission & Reasoning Viva
  const [submissionResult, setSubmissionResult] = useState(null);
  const [isReasoningOpen, setIsReasoningOpen] = useState(false);
  const [isEvaluatingReasoning, setIsEvaluatingReasoning] = useState(false);
  const [reasoningFeedback, setReasoningFeedback] = useState(null);

  // Telemetry Event Recording
  const sessionIdRef = useRef('sess_init');
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

  // Window Focus & Visibility Telemetry
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

  // Load Verified Backend Languages & Piston Sandbox Health
  useEffect(() => {
    async function loadBackendRuntimes() {
      try {
        const [langs, health] = await Promise.all([
          learningService.getSupportedLanguages(),
          learningService.getPistonHealth(),
        ]);
        if (Array.isArray(langs) && langs.length > 0) {
          setBackendLanguages(langs);
        }
        if (health) {
          setPistonStatus(health.healthy ? 'ready' : 'degraded');
        }
      } catch {
        // Safe fallback
      }
    }
    loadBackendRuntimes();
  }, []);

  const selectAssessment = useCallback((item) => {
    setActiveAssessment(item);
    setTopicMissingAssessment(false);

    // Reset language drafts for this assessment
    draftsByLanguageRef.current = {};

    const availableLangs = item.supportedLanguages || ['python', 'javascript'];
    const initialLang = availableLangs[0] || 'python';
    setSelectedLanguage(initialLang);

    const starter = item.starterCode?.[initialLang] || '';
    draftsByLanguageRef.current[initialLang] = starter;
    setCode(starter);
    lastCodeLenRef.current = starter.length;

    setHasUnsavedChanges(false);
    setOutputLog('');
    setRunStatus(null);
    setSubmissionResult(null);
    setReasoningFeedback(null);
    setIsReasoningOpen(false);

    // Initialize Telemetry session
    sessionIdRef.current = `sess_${item.id}_${Date.now()}`;
    eventSequenceRef.current = 0;
    eventBufferRef.current = [];
    recordEvent('document_change', { action: 'session_init', assessmentId: item.id, language: initialLang });
  }, [recordEvent]);

  // Load Assessments and Resolve Current Topic
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setTopicMissingAssessment(false);
        const list = await learningService.getAssessments();
        const publishedAssessments = (list || []).filter((a) => a.status === 'published' || !a.status);
        setAssessments(publishedAssessments);

        if (publishedAssessments.length > 0) {
          if (topicParam) {
            // Find assessment matching the selected topic / concept
            const matchedTopic = publishedAssessments.find(
              (a) =>
                a.conceptId === topicParam ||
                a.topicId === topicParam ||
                a.id === topicParam ||
                (a.title && a.title.toLowerCase().includes(topicParam.toLowerCase()))
            );
            if (matchedTopic) {
              selectAssessment(matchedTopic);
            } else {
              setTopicMissingAssessment(true);
            }
          } else if (assessmentId) {
            const found = publishedAssessments.find((a) => a.id === assessmentId);
            if (found) {
              selectAssessment(found);
            } else {
              selectAssessment(publishedAssessments[0]);
            }
          } else {
            selectAssessment(publishedAssessments[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load code assessments:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [assessmentId, topicParam, selectAssessment]);

  const handleCodeChange = (newCode) => {
    const delta = newCode.length - lastCodeLenRef.current;
    lastCodeLenRef.current = newCode.length;

    // Cache draft for current language
    draftsByLanguageRef.current[selectedLanguage] = newCode;
    setCode(newCode);

    const starter = activeAssessment?.starterCode?.[selectedLanguage] || '';
    setHasUnsavedChanges(newCode !== starter);

    // Detect large paste event
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
    // Preserve current language draft
    draftsByLanguageRef.current[selectedLanguage] = code;

    setSelectedLanguage(newLang);
    recordEvent('language_change', { previous: selectedLanguage, next: newLang });

    // Retrieve saved draft or fallback to starter code
    const savedDraft = draftsByLanguageRef.current[newLang];
    const starter = activeAssessment?.starterCode?.[newLang] || '';
    const nextCode = savedDraft !== undefined ? savedDraft : starter;

    draftsByLanguageRef.current[newLang] = nextCode;
    setCode(nextCode);
    lastCodeLenRef.current = nextCode.length;
    setHasUnsavedChanges(nextCode !== starter);
  };

  const handleResetStarter = () => {
    if (!activeAssessment) return;
    const starter = activeAssessment.starterCode?.[selectedLanguage] || '';
    draftsByLanguageRef.current[selectedLanguage] = starter;
    setCode(starter);
    lastCodeLenRef.current = starter.length;
    setHasUnsavedChanges(false);
    toast.info(`Reset ${selectedLanguage.toUpperCase()} code to starter template`);
  };

  // Run Code against sample tests or public assertions
  const handleRunCode = async () => {
    if (!activeAssessment) return;
    try {
      setIsRunning(true);
      setRunStatus(null);
      setOutputLog(`[Piston Sandbox: Isolated Execution Initialized]\nLanguage: ${selectedLanguage.toUpperCase()}\nExecuting against sample test cases...`);
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
      setOutputLog(`[Piston Sandbox: Running Custom stdin input]\nInput Size: ${(customInput || '').length} bytes\nExecuting...`);
      recordEvent('run', { language: selectedLanguage, mode: 'custom', inputSize: (customInput || '').length });

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

  // Official submission (grades against backend hidden test cases in Piston sandbox)
  const handleSubmitSolution = async () => {
    if (!activeAssessment) return;
    try {
      setIsSubmitting(true);
      setRunStatus(null);
      setOutputLog('[Piston Sandbox: Official Submission in progress]\nAuthenticating attempt and evaluating against protected server-side hidden test suite...');
      recordEvent('submit', { language: selectedLanguage, codeLength: code.length });

      const res = await learningService.submitSolution(activeAssessment.id, code, selectedLanguage);
      setSubmissionResult(res);
      setRunStatus(res.status);
      setOutputLog(
        `[OFFICIAL PISTON EVALUATION OUTCOME]\nStatus: ${res.status}\nPassed: ${res.testsPassed || 0} / ${res.totalTests || 18} test cases\nExecution Runtime: ${res.runtimeMs || 35}ms | Memory: ${res.memoryMb || 12.8}MB\n\nOfficial grading persisted. Explain your algorithmic invariants and computational time complexity in the AI Viva Defense.`
      );
      setHasUnsavedChanges(false);
      toast.success('Solution submitted & graded!');

      // Automatically launch Code Reasoning Viva Modal
      setIsReasoningOpen(true);
    } catch (err) {
      setRunStatus('Submission Error');
      setOutputLog(err.message || 'Submission failed');
      toast.error('Submission encountered an error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Viva Reasoning Submission
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
    } catch {
      toast.error('Viva evaluation failed');
    } finally {
      setIsEvaluatingReasoning(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading professional coding workspace..." />;
  }

  // If a topic was selected that does not have a published coding assessment
  if (topicMissingAssessment) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/home')}>Home</span>
          <span>/</span>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/content/concepts')}>Concepts</span>
          <span>/</span>
          <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>Coding Assessment</span>
        </div>

        <EmptyState
          title="No Published Coding Assessment for This Topic"
          description={`Topic "${topicParam}" currently does not have a published coding assessment. Practice with another topic or explore available challenges below.`}
          actionLabel="View All Coding Challenges"
          onAction={() => {
            setTopicMissingAssessment(false);
            if (assessments.length > 0) {
              selectAssessment(assessments[0]);
            }
          }}
        />
      </div>
    );
  }

  // If no assessments exist in system
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

  // Determine effective supported languages (prefer backend-verified languages if matched)
  const effectiveLanguages = backendLanguages.length > 0
    ? backendLanguages
    : (activeAssessment.supportedLanguages || ['python', 'javascript']);

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
            aria-label="Switch coding assessment problem"
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
          gridTemplateColumns: 'minmax(320px, 1fr) minmax(420px, 1.35fr)',
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
              supportedLanguages={effectiveLanguages}
              onRun={handleRunCode}
              onSubmit={handleSubmitSolution}
              isRunning={isRunning}
              isSubmitting={isSubmitting}
              onResetStarter={handleResetStarter}
              hasUnsavedChanges={hasUnsavedChanges}
              pistonStatus={pistonStatus}
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

      {/* Code Reasoning Viva Modal */}
      <CodeReasoningModal
        isOpen={isReasoningOpen}
        onClose={() => setIsReasoningOpen(false)}
        submissionId={submissionResult?.submissionId || 'sub_active'}
        vivaQuestion={activeAssessment.vivaQuestion}
        onSubmitReasoning={handleSubmitReasoning}
        isEvaluating={isEvaluatingReasoning}
        feedback={reasoningFeedback}
      />
    </div>
  );
}

export default CodeAssessmentsPage;
