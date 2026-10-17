import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Award,
  BookOpen,
  Code2,
  Cpu,
  ChevronLeft,
  ChevronRight,
  Send,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import { learningService } from '../../services/learningService';
import LoadingState from '../feedback/LoadingState';

export function DiagnosticAssessmentModal({ isOpen, onClose, onComplete }) {
  const dialogRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [activeSubjectIndex, setActiveSubjectIndex] = useState(0);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && results) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      dialogRef.current?.focus();
      loadAssessment();
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  async function loadAssessment() {
    try {
      setLoading(true);
      setErrorMessage('');
      const data = await learningService.getDiagnosticAssessment();
      if (!data) {
        setErrorMessage('Failed to load diagnostic assessment. Please try again.');
        return;
      }
      if (data.alreadyCompleted) {
        setResults(data.results);
      } else {
        setAssessment(data);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error connecting to diagnostic service.');
    } finally {
      setLoading(false);
    }
  }

  function handleSelectOption(questionId, optionId) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  }

  async function handleSubmit() {
    if (!assessment) return;
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < assessment.totalQuestions) {
      if (
        !window.confirm(
          `You have answered ${answeredCount} of ${assessment.totalQuestions} questions. Unanswered questions will be scored as 0. Do you want to submit now?`
        )
      ) {
        return;
      }
    }

    try {
      setSubmitting(true);
      setErrorMessage('');
      const formattedAnswers = Object.entries(answers).map(([questionId, selectedOptionId]) => ({
        questionId,
        selectedOptionId,
      }));

      const res = await learningService.submitDiagnosticAssessment(formattedAnswers);
      setResults(res);
      if (onComplete) {
        onComplete(res);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit diagnostic assessment.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const currentSection = assessment?.sections?.[activeSubjectIndex] || null;
  const currentQuestion = currentSection?.questions?.[activeQuestionIndex] || null;
  const totalQuestions = assessment?.totalQuestions || 30;
  const answeredCount = Object.keys(answers).length;

  // Flattened question list for progress calculations
  const allQuestions = assessment?.sections?.flatMap((s) => s.questions) || [];
  const globalIndex = currentQuestion
    ? allQuestions.findIndex((q) => q.id === currentQuestion.id)
    : 0;

  function handleNext() {
    if (!currentSection) return;
    if (activeQuestionIndex < currentSection.questions.length - 1) {
      setActiveQuestionIndex((prev) => prev + 1);
    } else if (activeSubjectIndex < (assessment.sections?.length || 0) - 1) {
      setActiveSubjectIndex((prev) => prev + 1);
      setActiveQuestionIndex(0);
    }
  }

  function handlePrev() {
    if (activeQuestionIndex > 0) {
      setActiveQuestionIndex((prev) => prev - 1);
    } else if (activeSubjectIndex > 0) {
      setActiveSubjectIndex((prev) => prev - 1);
      const prevSection = assessment.sections[activeSubjectIndex - 1];
      setActiveQuestionIndex(prevSection.questions.length - 1);
    }
  }

  const subjectIcons = [
    <BookOpen key="oop" size={16} />,
    <Code2 key="dsa" size={16} />,
    <Cpu key="os" size={16} />,
  ];

  return (
    <div
      className="modal-overlay"
      onClick={results ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby="diagnostic-modal-title"
      style={{
        zIndex: 1000,
        backgroundColor: 'rgba(15, 15, 20, 0.75)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="modal-dialog-card animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: results ? '640px' : '760px',
          width: '94%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          outline: 'none',
          borderRadius: '20px',
          border: '1px solid var(--border-hairline, #ECEAE8)',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.45)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-hairline, #ECEAE8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface-muted, #F7F6F5)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'var(--coral-soft, #FFEDE8)',
                border: '1px solid var(--coral-border, rgba(255, 91, 55, 0.25))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--coral, #FF5B37)',
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <h2
                id="diagnostic-modal-title"
                style={{
                  margin: 0,
                  fontSize: '1.05rem',
                  fontWeight: '600',
                  color: 'var(--text-main, #16161A)',
                }}
              >
                {results ? 'Diagnostic Placement Results' : 'Initial Adaptive Placement Diagnostic'}
              </h2>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary, #6B6B73)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '2px',
                }}
              >
                <span>30 Marks &bull; 3 Subjects (OOP, DSA, OS)</span>
                <span>&bull;</span>
                <span style={{ color: 'var(--coral, #FF5B37)', fontWeight: 600 }}>BKT Baseline Calibration</span>
              </div>
            </div>
          </div>
          {results && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted, #6B6B73)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '8px',
              }}
              title="Close modal"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
          }}
        >
          {loading && (
            <div style={{ padding: '40px 0' }}>
              <LoadingState message="Generating calibrated diagnostic assessment..." />
            </div>
          )}

          {errorMessage && (
            <div
              style={{
                padding: '14px 18px',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '16px',
              }}
            >
              <AlertTriangle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* RESULTS VIEW */}
          {results && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Overall Placement Banner */}
              <div
                style={{
                  padding: '20px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.12))',
                  border: '1px solid rgba(168,85,247,0.3)',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    marginBottom: '10px',
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span>Baseline Calibration Complete</span>
                </div>
                <h3
                  style={{
                    margin: '0 0 6px 0',
                    fontSize: '1.6rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                  }}
                >
                  {results.totalScore} / {results.maxTotalScore} Marks
                </h3>
                <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                  Overall Percentage: <strong>{results.percentage}%</strong> • Placement profile
                  recorded on student profile
                </p>
              </div>

              {/* Subject Breakdown Tiers */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--text-muted)',
                  }}
                >
                  Placement Tiers by Subject
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  {Object.entries(results.placements || {}).map(([key, item]) => {
                    const tierColor =
                      item.placement === 'advanced'
                        ? '#10b981'
                        : item.placement === 'intermediate'
                        ? '#3b82f6'
                        : '#f59e0b';
                    return (
                      <div
                        key={key}
                        style={{
                          padding: '16px',
                          borderRadius: '14px',
                          background: 'var(--bg-card-subtle)',
                          border: '1px solid var(--border-hairline)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                            {item.subjectTitle || key}
                          </span>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: `${tierColor}20`,
                              color: tierColor,
                            }}
                          >
                            {item.placement}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                            {item.score}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ 10 marks</span>
                        </div>
                        <div
                          style={{
                            height: '6px',
                            borderRadius: '3px',
                            background: 'var(--border-hairline)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${(item.score / 10) * 100}%`,
                              background: tierColor,
                              borderRadius: '3px',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* BKT & Next Steps Info */}
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: '12px',
                  background: 'var(--bg-card-subtle)',
                  border: '1px solid var(--border-hairline)',
                  fontSize: '0.84rem',
                  color: 'var(--text-muted)',
                  lineHeight: '1.45',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <TrendingUp size={20} style={{ color: 'var(--primary-light)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: 'var(--text-main)' }}>Bayesian Calibration Applied:</strong>{' '}
                  Your baseline knowledge parameters have been seeded. The adaptive engine will now recommend activities targeted at your weakest prerequisite boundaries.
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={onClose}
                className="btn-primary"
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '10px',
                }}
              >
                <span>Continue to Personalized Learning Path</span>
                <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* ASSESSMENT TAKING VIEW */}
          {assessment && !results && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Subject Tabs */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  borderBottom: '1px solid var(--border-hairline)',
                  paddingBottom: '12px',
                  overflowX: 'auto',
                }}
              >
                {assessment.sections?.map((sec, idx) => {
                  const isActive = idx === activeSubjectIndex;
                  const secAnsweredCount = sec.questions.filter((q) => Boolean(answers[q.id])).length;
                  return (
                    <button
                      key={sec.subjectId}
                      onClick={() => {
                        setActiveSubjectIndex(idx);
                        setActiveQuestionIndex(0);
                      }}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid',
                        borderColor: isActive ? 'var(--coral, #FF5B37)' : 'var(--border-hairline, #ECEAE8)',
                        background: isActive ? 'var(--coral-soft, #FFEDE8)' : '#FFFFFF',
                        color: isActive ? 'var(--coral, #FF5B37)' : 'var(--text-secondary, #6B6B73)',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {subjectIcons[idx] || <BookOpen size={16} />}
                      <span>{sec.subjectTitle}</span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '1px 6px',
                          borderRadius: '10px',
                          background:
                            secAnsweredCount === 10
                              ? 'var(--mastery-solid-soft, #E8F7F0)'
                              : 'var(--surface-muted, #F7F6F5)',
                          color: secAnsweredCount === 10 ? 'var(--mastery-solid, #17A673)' : 'inherit',
                          fontWeight: 600,
                        }}
                      >
                        {secAnsweredCount}/10
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Progress & Question Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary, #6B6B73)',
                }}
              >
                <span>
                  Question <strong>{activeQuestionIndex + 1}</strong> of{' '}
                  <strong>{currentSection?.questions.length || 10}</strong> in {currentSection?.subjectTitle}
                </span>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-pill, 9999px)',
                    background: 'var(--surface-muted, #F7F6F5)',
                    border: '1px solid var(--border-hairline, #ECEAE8)',
                    fontWeight: 600,
                    color: 'var(--text-main, #16161A)',
                  }}
                >
                  Overall Progress: {answeredCount} / {totalQuestions} Answered
                </span>
              </div>

              {/* Question Card */}
              {currentQuestion && (
                <div
                  style={{
                    padding: '20px',
                    borderRadius: '16px',
                    background: 'var(--surface-muted, #F7F6F5)',
                    border: '1px solid var(--border-hairline, #ECEAE8)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'var(--coral-soft, #FFEDE8)',
                        color: 'var(--coral, #FF5B37)',
                      }}
                    >
                      {currentQuestion.topicName}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #6B6B73)', fontWeight: 600 }}>1 Mark</span>
                  </div>

                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.98rem',
                      lineHeight: '1.5',
                      fontWeight: 600,
                      color: 'var(--text-main, #16161A)',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {currentQuestion.stem}
                  </p>

                  {/* Options List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {currentQuestion.options.map((option) => {
                      const isSelected = answers[currentQuestion.id] === option.id;
                      return (
                        <div
                          key={option.id}
                          onClick={() => handleSelectOption(currentQuestion.id, option.id)}
                          style={{
                            padding: '12px 16px',
                            borderRadius: '12px',
                            border: '1.5px solid',
                            borderColor: isSelected ? 'var(--coral, #FF5B37)' : 'var(--border-hairline, #ECEAE8)',
                            background: isSelected ? 'var(--coral-soft, #FFEDE8)' : '#FFFFFF',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              border: '2px solid',
                              borderColor: isSelected ? 'var(--coral, #FF5B37)' : 'var(--border-hairline, #ECEAE8)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              background: '#FFFFFF',
                            }}
                          >
                            {isSelected && (
                              <div
                                style={{
                                  width: '10px',
                                  height: '10px',
                                  borderRadius: '50%',
                                  background: 'var(--coral, #FF5B37)',
                                }}
                              />
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: '0.9rem',
                              color: isSelected ? 'var(--coral, #FF5B37)' : 'var(--text-main, #16161A)',
                              fontWeight: isSelected ? 600 : 400,
                            }}
                          >
                            {option.text}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        {!results && assessment && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border-hairline, #ECEAE8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--surface-muted, #F7F6F5)',
            }}
          >
            <button
              onClick={handlePrev}
              disabled={activeSubjectIndex === 0 && activeQuestionIndex === 0}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-pill, 9999px)',
                border: '1px solid var(--border-hairline, #ECEAE8)',
                background: '#FFFFFF',
                color: 'var(--text-main, #16161A)',
                fontSize: '0.85rem',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: activeSubjectIndex === 0 && activeQuestionIndex === 0 ? 0.4 : 1,
              }}
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  padding: '9px 18px',
                  borderRadius: 'var(--radius-pill, 9999px)',
                  background:
                    answeredCount === totalQuestions
                      ? 'var(--mastery-solid, #17A673)'
                      : 'var(--coral, #FF5B37)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: submitting ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <Send size={15} />
                <span>{submitting ? 'Submitting...' : 'Submit Assessment'}</span>
              </button>

              <button
                onClick={handleNext}
                disabled={
                  activeSubjectIndex === (assessment.sections?.length || 0) - 1 &&
                  activeQuestionIndex === (currentSection?.questions.length || 10) - 1
                }
                style={{
                  padding: '8px 18px',
                  borderRadius: 'var(--radius-pill, 9999px)',
                  border: 'none',
                  background: 'var(--dark-pill, #1C1C21)',
                  color: '#FFFFFF',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity:
                    activeSubjectIndex === (assessment.sections?.length || 0) - 1 &&
                    activeQuestionIndex === (currentSection?.questions.length || 10) - 1
                      ? 0.4
                      : 1,
                }}
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DiagnosticAssessmentModal;
