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
          <div className="saas-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', background: 'var(--surface-muted)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
                Diagnostic Evaluation Summary &bull; {activeQuiz.title}
              </span>
              <span className="badge-clean green">Scored & Verified</span>
            </div>

            <div style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span className="badge-clean green" style={{ fontSize: '10px' }}>
                      Diagnostic Complete
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                      Evaluated & calibrated
                    </span>
                  </div>
                  <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)' }}>{activeQuiz.title}</h1>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '36px', fontWeight: '800', color: attemptResult.passed ? 'var(--success)' : 'var(--warning)', letterSpacing: '-0.02em' }}>
                    {attemptResult.score}%
                  </span>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {attemptResult.correctCount} of {attemptResult.totalCount} correct answers
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {attemptResult.details.map((item, idx) => (
                  <div
                    key={item.questionId}
                    style={{
                      padding: '16px 20px',
                      borderRadius: '8px',
                      border: item.isCorrect ? '1px solid var(--border)' : '1px solid var(--danger-border)',
                      background: item.isCorrect ? 'var(--surface-muted)' : 'rgba(239, 68, 68, 0.08)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <span style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--text-main)' }}>
                        Q{idx + 1}. {item.prompt}
                      </span>
                      <span className={`badge-clean ${item.isCorrect ? 'green' : 'red'}`}>
                        {item.isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>

                    <div style={{ marginTop: '10px', padding: '10px 14px', background: 'var(--surface)', borderRadius: '6px', fontSize: '12.5px', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                      <strong style={{ color: 'var(--text-main)' }}>Explanation:</strong> {item.explanation}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setActiveQuiz(null)}
                >
                  Back to Quizzes List
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => startQuiz(activeQuiz)}
                >
                  <RotateCcw size={14} />
                  <span>Retake Quiz</span>
                </button>
              </div>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge-clean blue" style={{ fontSize: '10px' }}>
                Diagnostic Check
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                Adaptive prerequisite check
              </span>
            </div>
            <h1 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>{activeQuiz.title}</h1>
          </div>
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: '6px 14px', fontSize: '12px' }}
            onClick={() => setActiveQuiz(null)}
          >
            Exit Quiz
          </button>
        </div>

        {/* Progress Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
            <span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
            <span>{answeredCount} of {totalQuestions} answered</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'var(--surface-muted)', borderRadius: '9999px', overflow: 'hidden' }}>
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
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'var(--warning-subtle)',
              border: '1px solid var(--warning-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} color="var(--warning)" />
              <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#92400E' }}>
                You have {totalQuestions - answeredCount} unanswered questions. Submit anyway?
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: '5px 12px', fontSize: '12px', background: 'var(--warning)', borderColor: 'var(--warning)' }}
                onClick={executeSubmission}
              >
                Confirm Submit
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '5px 12px', fontSize: '12px' }}
                onClick={() => setShowUnansweredWarning(false)}
              >
                Go Back
              </button>
            </div>
          </div>
        )}

        {/* Question Card */}
        <div className="saas-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 0 }}>
          <div style={{ padding: '12px 18px', background: 'var(--surface-muted)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </span>
            <span className="badge-clean blue">
              {activeQuiz.conceptName}
            </span>
          </div>

          <div style={{ padding: '28px' }}>
            <h2 style={{ fontSize: '16.5px', fontWeight: '700', lineHeight: '1.5', color: 'var(--text-main)', marginBottom: '20px' }}>
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
                      gap: '12px',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                      background: isSelected ? 'var(--primary-subtle)' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 120ms ease',
                    }}
                  >
                    <input
                      type="radio"
                      name={`q_${currentQ.id}`}
                      checked={isSelected}
                      onChange={() => handleSelectOption(currentQ.id, optIdx)}
                      style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
                    />
                    <span style={{ fontSize: '13.5px', fontWeight: isSelected ? '600' : '500', color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>
                      {optionText}
                    </span>
                  </label>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={handlePrev}
                disabled={currentQuestionIndex === 0}
              >
                <ArrowLeft size={14} />
                <span>Previous</span>
              </button>

              {currentQuestionIndex < totalQuestions - 1 ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleNext}
                >
                  <span>Next</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleAttemptSubmit}
                  disabled={submitting}
                >
                  <Check size={14} />
                  <span>{submitting ? 'Scoring...' : 'Submit Diagnostic'}</span>
                </button>
              )}
            </div>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span className="badge-clean blue" style={{ fontSize: '10.5px' }}>
            Curriculum Evaluations
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
            Concept quizzes & prerequisite checks
          </span>
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          Concept Quizzes & Diagnostics
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Targeted multiple-choice evaluations calibrated to measure prerequisite concept readiness without guesswork.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
        {quizzes.map((quiz) => (
          <div key={quiz.id} className="saas-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <span className="badge-clean blue">{quiz.conceptName}</span>
                <span className={`badge-clean ${quiz.status === 'completed' ? 'green' : 'amber'}`}>
                  {quiz.status === 'completed' ? 'Passed' : 'Available'}
                </span>
              </div>

              <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px' }}>{quiz.title}</h2>
              <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                <span>{quiz.questionsCount} Questions</span>
                <span>&bull;</span>
                <span>~{quiz.estimatedMinutes} mins</span>
              </div>

              {quiz.status === 'completed' && quiz.lastAttemptScore !== null && (
                <div style={{ padding: '6px 10px', background: 'var(--success-subtle)', borderRadius: '6px', fontSize: '12px', color: '#065F46', fontWeight: '600', marginBottom: '14px', border: '1px solid var(--success-border)' }}>
                  Latest score: {quiz.lastAttemptScore}% ({quiz.lastAttemptDate})
                </div>
              )}
            </div>

            <button
              type="button"
              className="btn-primary"
              style={{ width: '100%', marginTop: '8px' }}
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
