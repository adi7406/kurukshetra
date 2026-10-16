import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Clock,
  Sparkles,
  FileQuestion,
  Check,
} from 'lucide-react';
import { learningService } from '../services/learningService';
import LoadingState from '../components/feedback/LoadingState';

export function QuizPage() {
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null);

  // Active quiz attempt state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showUnansweredWarning, setShowUnansweredWarning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attemptResult, setAttemptResult] = useState(null);

  useEffect(() => {
    loadQuizzes();
  }, []);

  async function loadQuizzes() {
    try {
      setLoading(true);
      const data = await learningService.getQuizzes();
      setQuizzes(data);
    } catch (err) {
      console.error('Failed to load quizzes:', err);
    } finally {
      setLoading(false);
    }
  }

  const startQuiz = (quiz) => {
    setActiveQuiz(quiz);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowUnansweredWarning(false);
    setAttemptResult(null);
  };

  const handleSelectOption = (questionId, optionIndex) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleNext = () => {
    if (activeQuiz && currentQuestionIndex < activeQuiz.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleAttemptSubmit = () => {
    if (!activeQuiz) return;
    const unansweredCount = activeQuiz.questions.filter(
      (q) => selectedAnswers[q.id] === undefined
    ).length;

    if (unansweredCount > 0) {
      setShowUnansweredWarning(true);
    } else {
      executeSubmission();
    }
  };

  const executeSubmission = async () => {
    setShowUnansweredWarning(false);
    try {
      setSubmitting(true);
      const result = await learningService.submitQuizAttempt(activeQuiz.id, selectedAnswers);
      setAttemptResult(result);
      await loadQuizzes();
    } catch (err) {
      console.error('Quiz submission error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading diagnostic quizzes..." />;
  }

  // -------------------------------------------------------------
  // ACTIVE QUIZ TAKING INTERFACE
  // -------------------------------------------------------------
  if (activeQuiz) {
    const questions = activeQuiz.questions;
    const totalQuestions = questions.length;
    const currentQ = questions[currentQuestionIndex];
    const isAnswered = selectedAnswers[currentQ?.id] !== undefined;
    const answeredCount = Object.keys(selectedAnswers).length;

    // Results screen
    if (attemptResult) {
      return (
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          <div className="studdy-card" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <span className="ai-badge" style={{ marginBottom: '6px' }}>Diagnostic Complete</span>
                <h1 style={{ fontSize: '22px', fontWeight: '800' }}>{activeQuiz.title}</h1>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '36px', fontWeight: '800', color: attemptResult.passed ? 'var(--success)' : 'var(--warning)' }}>
                  {attemptResult.score}%
                </span>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {attemptResult.correctCount} of {attemptResult.totalCount} correct
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              {attemptResult.details.map((item, idx) => (
                <div
                  key={item.questionId}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '16px',
                    border: '1px solid var(--border-light)',
                    background: item.isCorrect ? 'var(--surface-subtle)' : '#FEF2F2',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ fontWeight: '700', fontSize: '14px' }}>
                      Q{idx + 1}. {item.prompt}
                    </span>
                    <span className={`role-badge ${item.isCorrect ? 'student' : 'teacher'}`}>
                      {item.isCorrect ? 'Correct ✓' : 'Incorrect ✗'}
                    </span>
                  </div>

                  <div style={{ marginTop: '10px', padding: '10px 14px', background: 'var(--surface)', borderRadius: '12px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    <strong>Explanation:</strong> {item.explanation}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                className="btn-studdy btn-studdy-secondary"
                onClick={() => setActiveQuiz(null)}
              >
                Back to Quizzes List
              </button>
              <button
                type="button"
                className="btn-studdy btn-studdy-primary"
                onClick={() => startQuiz(activeQuiz)}
              >
                <RotateCcw size={15} />
                <span>Retake Quiz</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Active Quiz Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase' }}>
              Concept Diagnostic Check
            </span>
            <h1 style={{ fontSize: '20px', fontWeight: '800', marginTop: '2px' }}>{activeQuiz.title}</h1>
          </div>
          <button
            type="button"
            className="btn-studdy btn-studdy-secondary"
            style={{ padding: '6px 14px', fontSize: '12.5px' }}
            onClick={() => setActiveQuiz(null)}
          >
            Exit Quiz
          </button>
        </div>

        {/* Progress Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '6px' }}>
            <span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
            <span>{answeredCount} of {totalQuestions} answered</span>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'var(--surface-muted)', borderRadius: '9999px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%`,
                height: '100%',
                background: 'var(--primary)',
                transition: 'width 200ms ease',
              }}
            />
          </div>
        </div>

        {/* Unanswered warning */}
        {showUnansweredWarning && (
          <div
            style={{
              padding: '14px 18px',
              borderRadius: '16px',
              background: 'var(--warning-subtle)',
              border: '1px solid #FDE68A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} color="var(--warning)" />
              <span style={{ fontSize: '13px', fontWeight: '600' }}>
                You have {totalQuestions - answeredCount} unanswered questions. Submit anyway?
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn-studdy btn-studdy-primary"
                style={{ padding: '6px 14px', fontSize: '12px', background: 'var(--warning)' }}
                onClick={executeSubmission}
              >
                Confirm Submit
              </button>
              <button
                type="button"
                className="btn-studdy btn-studdy-secondary"
                style={{ padding: '6px 14px', fontSize: '12px' }}
                onClick={() => setShowUnansweredWarning(false)}
              >
                Go Back
              </button>
            </div>
          </div>
        )}

        {/* Question Card */}
        <div className="studdy-card" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: '700', lineHeight: '1.5', marginBottom: '22px' }}>
            {currentQ?.prompt}
          </h2>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {currentQ?.options?.map((optionText, optIdx) => {
              const isSelected = selectedAnswers[currentQ.id] === optIdx;

              return (
                <label
                  key={optIdx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '14px 18px',
                    borderRadius: '16px',
                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                    background: isSelected ? 'var(--primary-subtle)' : 'var(--surface-subtle)',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                >
                  <input
                    type="radio"
                    name={`q_${currentQ.id}`}
                    checked={isSelected}
                    onChange={() => handleSelectOption(currentQ.id, optIdx)}
                    style={{ accentColor: 'var(--primary)', width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: isSelected ? '700' : '500', color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>
                    {optionText}
                  </span>
                </label>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px' }}>
            <button
              type="button"
              className="btn-studdy btn-studdy-secondary"
              onClick={handlePrev}
              disabled={currentQuestionIndex === 0}
            >
              <ArrowLeft size={15} />
              <span>Previous</span>
            </button>

            {currentQuestionIndex < totalQuestions - 1 ? (
              <button
                type="button"
                className="btn-studdy btn-studdy-primary"
                onClick={handleNext}
              >
                <span>Next</span>
                <ArrowRight size={15} />
              </button>
            ) : (
              <button
                type="button"
                className="btn-studdy btn-studdy-primary"
                onClick={handleAttemptSubmit}
                disabled={submitting}
              >
                <Check size={15} />
                <span>{submitting ? 'Scoring...' : 'Submit Diagnostic'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // QUIZZES LISTING
  // -------------------------------------------------------------
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Concept Quizzes & Diagnostics</h1>
        <p style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>
          Targeted multiple-choice evaluations calibrated to measure prerequisite concept readiness.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '18px' }}>
        {quizzes.map((quiz) => (
          <div key={quiz.id} className="studdy-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span className="ai-badge">{quiz.conceptName}</span>
                <span className={`role-badge ${quiz.status === 'completed' ? 'student' : 'teacher'}`}>
                  {quiz.status === 'completed' ? 'Passed' : 'Available'}
                </span>
              </div>

              <h2 style={{ fontSize: '16.5px', fontWeight: '700', marginBottom: '6px' }}>{quiz.title}</h2>
              <div style={{ display: 'flex', gap: '14px', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                <span>{quiz.questionsCount} Questions</span>
                <span>&bull;</span>
                <span>~{quiz.estimatedMinutes} mins</span>
              </div>

              {quiz.status === 'completed' && quiz.lastAttemptScore !== null && (
                <div style={{ padding: '8px 12px', background: 'var(--success-subtle)', borderRadius: '12px', fontSize: '12.5px', color: 'var(--success)', fontWeight: '700', marginBottom: '14px' }}>
                  Latest score: {quiz.lastAttemptScore}% ({quiz.lastAttemptDate})
                </div>
              )}
            </div>

            <button
              type="button"
              className="btn-studdy btn-studdy-primary"
              style={{ width: '100%' }}
              onClick={() => startQuiz(quiz)}
            >
              {quiz.status === 'completed' ? 'Retake Diagnostic Quiz' : 'Start Diagnostic Quiz'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default QuizPage;
