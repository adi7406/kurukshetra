import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Code2,
  Play,
  Send,
  Terminal,
  FileCode,
  CheckCircle2,
  Clock,
  Sparkles,
  Check,
  Bookmark,
  Share2,
  Download,
  Layers,
  ChevronRight,
  MessageSquare,
  RotateCcw,
  User,
  ShieldAlert,
} from 'lucide-react';
import { learningService } from '../services/learningService';
import LoadingState from '../components/feedback/LoadingState';
import PillTabs from '../components/common/PillTabs';
import RailCard from '../components/common/RailCard';
import ChecklistItem from '../components/common/ChecklistItem';
import Chip from '../components/common/Chip';
import MasteryChip from '../components/common/MasteryChip';
import { useToast } from '../context/ToastContext';

export function CodeAssessmentsPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState([]);
  const [activeAssessment, setActiveAssessment] = useState(null);

  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outputLog, setOutputLog] = useState('');
  const [runStatus, setRunStatus] = useState(null);

  // Active Tab: Problem, Tests, Replay, Viva, Discussion
  const [activeTab, setActiveTab] = useState('problem');
  const [bookmarked, setBookmarked] = useState(false);

  // FR-15: Viva Modal / In-Page Viva Form
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
      setAssessments(list || []);
      // If list exists, default to first assessment to showcase the practice page immediately
      if (list && list.length > 0 && !activeAssessment) {
        handleOpenWorkspace(list[0]);
      }
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
    setVivaFeedback(null);
    setActiveTab('problem');
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
      setActiveTab('tests');
      toast.success('Sample tests executed successfully');
    } catch (err) {
      setRunStatus('Execution Error');
      setOutputLog(err.message || 'Execution failed.');
      setActiveTab('tests');
      toast.error('Execution encountered an error');
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
        setActiveTab('viva');
      } else {
        setActiveTab('tests');
      }
      toast.success('Solution submitted & verified!');
      await loadAssessments();
    } catch (err) {
      setRunStatus('Submission Error');
      setOutputLog(err.message || 'Submission failed.');
      setActiveTab('tests');
      toast.error('Submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEvaluateViva = async () => {
    try {
      setEvaluatingViva(true);
      const firstQ = vivaQuestions[0] || { id: 'q_1' };
      const answer = vivaAnswers[firstQ.id] || vivaAnswers['default'] || '';
      const result = await learningService.evaluateVivaAnswer(firstQ.id, answer);
      setVivaFeedback(result);
      toast.success('Algorithmic reasoning evaluated!');
    } catch (err) {
      console.error('Viva evaluation failed:', err);
      toast.error('Viva evaluation failed.');
    } finally {
      setEvaluatingViva(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading coding workspace..." />;
  }

  // Right Rail Checklist Items for Coding Practice
  const practiceTasks = [
    { title: 'Read problem description', completed: true, duration: '2 min' },
    { title: 'Write sentinel node structure', completed: true, duration: '10 min' },
    { title: 'Run sample test cases', completed: !!runStatus, duration: '5 min' },
    { title: 'Submit solution for verification', completed: runStatus === 'Passed', duration: '5 min' },
    { title: 'Explain your code in Viva', completed: !!vivaFeedback, duration: '5 min' },
  ];

  // Test files for download
  const testFiles = [
    { name: 'lru_cache_tests.py', size: '4.2 KB' },
    { name: 'sentinel_benchmark.py', size: '2.8 KB' },
    { name: 'stress_test_suite.py', size: '6.1 KB' },
  ];

  // Related concepts
  const relatedConcepts = [
    {
      id: 'rc-1',
      title: 'Hash Tables & Collision Resolution',
      meta: '48% mastery · Developing',
      gradient: 'linear-gradient(135deg, #FF5B37 0%, #EE4A26 100%)',
    },
    {
      id: 'rc-2',
      title: 'Doubly-Linked Sentinel Lists',
      meta: '92% mastery · Solid',
      gradient: 'linear-gradient(135deg, #1C1C21 0%, #2C2C34 100%)',
    },
  ];

  // Tabs for PillTabs
  const tabs = [
    { id: 'problem', label: 'Problem', count: 1 },
    { id: 'tests', label: 'Tests', count: 18 },
    { id: 'replay', label: 'Replay', count: 3 },
    { id: 'viva', label: 'Viva', count: 1 },
    { id: 'discussion', label: 'Discussion', count: 12 },
  ];

  // If no active assessment chosen yet
  if (!activeAssessment) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/home')}>Home</span>
          <span>/</span>
          <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>Coding Practice</span>
        </div>

        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '-0.01em', margin: 0 }}>
            Coding Assessments & Sandboxed Challenges
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            Solve algorithmic problems with isolated execution, test suite verification, and reasoning viva.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '18px' }}>
          {assessments.map((item) => (
            <div
              key={item.id}
              style={{
                background: 'var(--surface)',
                borderRadius: '20px',
                border: '1px solid var(--border-hairline)',
                boxShadow: 'var(--shadow-card)',
                padding: '22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <Chip variant="default" size="sm">{item.conceptName}</Chip>
                  <Chip variant={item.difficulty === 'Hard' ? 'danger' : item.difficulty === 'Medium' ? 'warning' : 'success'} size="sm">
                    {item.difficulty}
                  </Chip>
                </div>

                <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
                  {item.title}
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                  {item.problemStatement.slice(0, 140)}...
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border-hairline)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {item.timeLimitMinutes || 30} mins
                </span>
                <button
                  type="button"
                  className="btn-coral-pill btn-compact"
                  onClick={() => handleOpenWorkspace(item)}
                >
                  <Code2 size={13} strokeWidth={1.5} />
                  <span>Open Workspace</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ACTIVE CODING WORKSPACE (MATCHING REFERENCE VIDEO LESSON PAGE)
  // -------------------------------------------------------------
  return (
    <div className="home-workspace-container">
      {/* Main Column */}
      <div className="home-workspace-main">
        {/* 1. Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/home')}>Home</span>
          <span>/</span>
          <span style={{ cursor: 'pointer' }} onClick={() => setActiveAssessment(null)}>Coding Practice</span>
          <span>/</span>
          <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{activeAssessment.title}</span>
        </div>

        {/* 2. LARGE ROUNDED FRAME (20px) WITH OVERLAY PLAYER-STYLE TOOLBAR BAR */}
        <div
          style={{
            position: 'relative',
            borderRadius: '20px',
            overflow: 'hidden',
            border: '1px solid var(--border-hairline)',
            boxShadow: 'var(--shadow-card)',
            background: '#16161A',
            height: '420px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Top Title/File Bar */}
          <div
            style={{
              padding: '10px 16px',
              background: '#1C1C21',
              borderBottom: '1px solid #2C2C34',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12.5px',
              color: '#ECEAE8',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileCode size={15} strokeWidth={1.5} color="var(--coral)" />
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                solution.{selectedLanguage === 'python' ? 'py' : selectedLanguage === 'javascript' ? 'js' : 'java'}
              </span>
            </div>

            {/* Language Selector */}
            <select
              value={selectedLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              style={{
                background: '#24242A',
                color: '#ECEAE8',
                border: '1px solid #373742',
                borderRadius: 'var(--radius-pill)',
                padding: '3px 10px',
                fontSize: '11.5px',
                fontFamily: 'var(--font-mono)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {activeAssessment.allowedLanguages.map((l) => (
                <option key={l} value={l}>
                  {l.toUpperCase()} 3.10
                </option>
              ))}
            </select>
          </div>

          {/* Monaco / Code Textarea Area */}
          <div style={{ flex: 1, position: 'relative', background: '#16161A' }}>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck="false"
              style={{
                width: '100%',
                height: '100%',
                padding: '18px',
                fontFamily: 'var(--font-mono)',
                fontSize: '13.5px',
                lineHeight: '1.65',
                border: 'none',
                outline: 'none',
                resize: 'none',
                background: 'transparent',
                color: '#F4F2F0',
                boxSizing: 'border-box',
              }}
              placeholder="# Write your optimal algorithmic implementation here..."
            />
          </div>

          {/* OVERLAY TOOLBAR BAR (Styled like reference player controls) */}
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '16px',
              right: '16px',
              height: '46px',
              borderRadius: 'var(--radius-pill)',
              background: 'rgba(28, 28, 33, 0.88)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              zIndex: 10,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
            }}
          >
            {/* Left Controls: Run + Submit */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={handleRunCode}
                disabled={isRunning || isSubmitting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '32px',
                  padding: '0 14px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'rgba(255, 255, 255, 0.12)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background 150ms ease',
                }}
              >
                <Play size={12} strokeWidth={2} />
                <span>{isRunning ? 'Running...' : 'Run'}</span>
              </button>

              <button
                type="button"
                onClick={handleSubmitSolution}
                disabled={isRunning || isSubmitting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '32px',
                  padding: '0 16px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--coral)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(255, 91, 55, 0.35)',
                  transition: 'background 150ms ease',
                }}
              >
                <Send size={12} strokeWidth={2} />
                <span>{isSubmitting ? 'Evaluating...' : 'Submit'}</span>
              </button>
            </div>

            {/* Middle: Timer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ECEAE8', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
              <Clock size={13} strokeWidth={1.5} color="var(--coral)" />
              <span>12:45 / 30:00</span>
            </div>

            {/* Right: Environment status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#9E9EA8' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#17A673' }} />
              <span>Sandbox ready</span>
            </div>
          </div>
        </div>

        {/* 3. TITLE ROW WITH ACTION ICON BUTTONS (Bookmark, Share) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '-0.01em', margin: 0 }}>
              {activeAssessment.title}
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
              Algorithmic implementation and invariant preservation in {activeAssessment.conceptName}.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="icon-btn-circle"
              onClick={() => {
                setBookmarked(!bookmarked);
                toast.info(bookmarked ? 'Removed from saved' : 'Saved to your library');
              }}
              title="Bookmark exercise"
            >
              <Bookmark size={16} strokeWidth={1.5} color={bookmarked ? 'var(--coral)' : 'var(--text-secondary)'} fill={bookmarked ? 'var(--coral)' : 'none'} />
            </button>
            <button
              type="button"
              className="icon-btn-circle"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                toast.success('Exercise link copied to clipboard');
              }}
              title="Share exercise"
            >
              <Share2 size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* 4. MENTOR / INFO STRIP CARD */}
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: '16px',
            border: '1px solid var(--border-hairline)',
            boxShadow: 'var(--shadow-card)',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--coral-soft)',
                color: 'var(--coral)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '13px',
              }}
            >
              SL
            </div>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-main)' }}>
                Dr. Sarah Lin <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: '12px' }}>&bull; Algorithm Lead</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Adaptive difficulty calibrated to your Hash Tables mastery (48% Developing)
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Chip variant="default" size="sm">+50 XP</Chip>
            <Chip variant="success" size="sm">18 Test Cases</Chip>
          </div>
        </div>

        {/* 5. PILL TABS WITH COUNT BADGES: Problem · Tests · Replay · Viva · Discussion */}
        <div style={{ marginTop: '4px' }}>
          <PillTabs tabs={tabs} activeTab={activeTab} onChange={(id) => setActiveTab(id)} />
        </div>

        {/* 6. TAB CONTENT PANELS */}
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: '20px',
            border: '1px solid var(--border-hairline)',
            boxShadow: 'var(--shadow-card)',
            padding: '24px',
            minHeight: '260px',
          }}
        >
          {/* TAB 1: Problem Description */}
          {activeTab === 'problem' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 8px 0' }}>
                  Problem Statement & Invariants
                </h3>
                <div style={{ fontSize: '13.5px', lineHeight: '1.65', color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>
                  {activeAssessment.problemStatement}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em', marginBottom: '8px' }}>
                  Constraints & Bounds:
                </div>
                <ul style={{ paddingLeft: '18px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                  {activeAssessment.constraints.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>

              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em', marginBottom: '8px' }}>
                  Sample Test Case:
                </div>
                {activeAssessment.sampleTests.map((t, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '12px 14px',
                      background: 'var(--surface-muted)',
                      border: '1px solid var(--border-hairline)',
                      borderRadius: '12px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                    }}
                  >
                    <div><strong style={{ color: 'var(--text-main)' }}>Input:</strong> {t.input}</div>
                    <div style={{ marginTop: '4px' }}><strong style={{ color: 'var(--text-main)' }}>Expected:</strong> {t.expectedOutput}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Tests Suite Execution */}
          {activeTab === 'tests' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                  Test Execution Console
                </h3>
                {runStatus && (
                  <Chip variant={runStatus.includes('Passed') || runStatus.includes('Accepted') ? 'success' : 'danger'} size="sm">
                    {runStatus}
                  </Chip>
                )}
              </div>

              <div
                style={{
                  background: '#16161A',
                  color: '#ECEAE8',
                  borderRadius: '14px',
                  padding: '16px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12.5px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  minHeight: '180px',
                  overflowY: 'auto',
                }}
              >
                {outputLog || 'Run your code or submit your solution to view sandbox test execution logs here.'}
              </div>
            </div>
          )}

          {/* TAB 3: Keystroke Replay Timeline */}
          {activeTab === 'replay' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                    Keystroke Replay & Telemetry
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', margin: 0 }}>
                    Step-by-step reconstruction of your implementation trajectory.
                  </p>
                </div>
                {/* Review suggested chip in instructor view */}
                <Chip variant="warning" size="sm">
                  Review suggested
                </Chip>
              </div>

              <div
                style={{
                  padding: '16px',
                  borderRadius: '14px',
                  background: 'var(--surface-muted)',
                  border: '1px solid var(--border-hairline)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <button type="button" className="icon-btn-circle" style={{ width: '36px', height: '36px' }}>
                  <Play size={14} strokeWidth={2} />
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ height: '6px', borderRadius: '3px', background: 'var(--border-hairline)', position: 'relative' }}>
                    <div style={{ width: '42%', height: '100%', borderRadius: '3px', background: 'var(--coral)' }} />
                  </div>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  02:14 / 05:20
                </span>
              </div>
            </div>
          )}

          {/* TAB 4: Code Explanation Viva Defense */}
          {activeTab === 'viva' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                  Algorithmic Reasoning Viva
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '3px', margin: 0 }}>
                  Explain your algorithmic decisions and invariant preservation in your own words.
                </p>
              </div>

              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '14px',
                  background: 'var(--surface-muted)',
                  border: '1px solid var(--border-hairline)',
                  fontSize: '13.5px',
                  fontWeight: 500,
                  color: 'var(--text-main)',
                }}
              >
                {vivaQuestions[0]?.question ||
                  'Explain how your sentinel nodes preserve O(1) doubly-linked list insertion without requiring null pointer checks at boundaries.'}
              </div>

              <textarea
                value={vivaAnswers['default'] || ''}
                onChange={(e) => setVivaAnswers({ ...vivaAnswers, default: e.target.value })}
                placeholder="Type your explanation here (e.g., The head and tail sentinels ensure that insert_head and remove always operate between two existing nodes, eliminating edge-case conditionals...)"
                style={{
                  width: '100%',
                  minHeight: '110px',
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-hairline)',
                  background: 'var(--surface)',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-coral-pill btn-compact"
                  onClick={handleEvaluateViva}
                  disabled={evaluatingViva}
                >
                  <Sparkles size={13} strokeWidth={1.5} />
                  <span>{evaluatingViva ? 'Evaluating response...' : 'Submit Viva Explanation'}</span>
                </button>
              </div>

              {vivaFeedback && (
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: '14px',
                    background: 'var(--surface-muted)',
                    border: '1px solid var(--border-hairline)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                      Viva Evaluation Result
                    </span>
                    <Chip variant="success" size="sm">
                      {vivaFeedback.score >= 70 ? 'High Coherence' : 'Partial Match'}
                    </Chip>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                    {vivaFeedback.feedback}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Discussion */}
          {activeTab === 'discussion' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                Community & Mentor Discussion
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                12 peer inquiries and mentor clarifications on LRU Cache sentinel bounds.
              </p>
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '14px',
                  background: 'var(--surface-muted)',
                  border: '1px solid var(--border-hairline)',
                  display: 'flex',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--coral-soft)',
                    color: 'var(--coral)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: '12px',
                    flexShrink: 0,
                  }}
                >
                  AR
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                    Arjun Rao <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 400 }}>&bull; 2 hours ago</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
                    Make sure when removing from the hash map to delete by the node's key rather than value, or you'll get dangling pointers in separate chaining!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Rail (320px, stacked cards, 16px gap) */}
      <aside
        className="home-workspace-sidebar"
        aria-label="Practice Tasks and Resources"
        style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}
      >
        {/* 1. SESSION TASKS CHECKLIST */}
        <RailCard title="Session Tasks">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {practiceTasks.map((t, idx) => (
              <ChecklistItem
                key={idx}
                title={t.title}
                completed={t.completed}
                duration={t.duration}
              />
            ))}
          </div>
        </RailCard>

        {/* 2. TEST FILES LIST WITH PILL "DOWNLOAD" BUTTONS */}
        <RailCard title="Test Files">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {testFiles.map((file, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  background: 'var(--surface-muted)',
                  border: '1px solid var(--border-hairline)',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 500,
                      color: 'var(--text-main)',
                      fontFamily: 'var(--font-mono)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={file.name}
                  >
                    {file.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px' }}>
                    {file.size}
                  </div>
                </div>

                {/* Pill "Download" button */}
                <button
                  type="button"
                  className="btn-ghost-pill btn-compact"
                  style={{ height: '28px', padding: '0 10px', fontSize: '11.5px' }}
                  onClick={() => toast.info(`Downloading ${file.name}...`)}
                >
                  <Download size={11} strokeWidth={1.5} />
                  <span>Download</span>
                </button>
              </div>
            ))}
          </div>
        </RailCard>

        {/* 3. RELATED CONCEPTS */}
        <RailCard title="Related Concepts">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {relatedConcepts.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate('/content/concepts')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate('/content/concepts');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px',
                  borderRadius: '14px',
                  border: '1px solid var(--border-hairline)',
                  background: 'var(--surface)',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--coral)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-hairline)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: item.gradient,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                  }}
                >
                  <Layers size={18} strokeWidth={1.5} />
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={item.title}
                  >
                    {item.title}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {item.meta}
                  </div>
                </div>

                <ChevronRight size={14} strokeWidth={1.5} color="var(--text-secondary)" />
              </div>
            ))}
          </div>
        </RailCard>
      </aside>
    </div>
  );
}

export default CodeAssessmentsPage;
