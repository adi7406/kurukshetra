import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Clock,
  Sparkles,
  Check,
} from 'lucide-react';
import { learningService } from '../services/learningService';
import LoadingState from '../components/feedback/LoadingState';
import Chip from '../components/common/Chip';
import MasteryChip from '../components/common/MasteryChip';

export function QuizPage() {
  const navigate = useNavigate();
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
      setQuizzes(data || []);
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
  // ACTIVE QUIZ INTERFACE
  // -------------------------------------------------------------
  if (activeQuiz) {
    const questions = activeQuiz.questions || [];
    const totalQuestions = questions.length;
    const currentQ = questions[currentQuestionIndex];
    const isAnswered = selectedAnswers[currentQ?.id] !== undefined;
    const answeredCount = Object.keys(selectedAnswers).length;

    // Results screen
    if (attemptResult) {
      return (
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: '20px',
              border: '1px solid var(--border-hairline)',
              boxShadow: 'var(--shadow-card)',
              padding: '28px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em' }}>
                  Diagnostic Evaluation Complete
                </div>
                <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '-0.01em', margin: '4px 0 0 0' }}>
                  {activeQuiz.title}
                </h1>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '36px', fontWeight: 600, color: attemptResult.passed ? 'var(--mastery-solid)' : 'var(--mastery-developing)', letterSpacing: '-0.01em' }}>
                  {attemptResult.score}%
                </span>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
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
                    borderRadius: '14px',
                    border: '1px solid var(--border-hairline)',
                    background: item.isCorrect ? 'var(--mastery-solid-soft)' : 'var(--mastery-weak-soft)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-main)' }}>
                      Q{idx + 1}. {item.prompt}
                    </span>
                    <Chip variant={item.isCorrect ? 'success' : 'danger'} size="sm">
                      {item.isCorrect ? 'Correct' : 'Incorrect'}
                    </Chip>
                  </div>

                  <div style={{ marginTop: '10px', padding: '10px 14px', background: 'var(--surface)', borderRadius: '10px', fontSize: '12.5px', color: 'var(--text-secondary)', border: '1px solid var(--border-hairline)' }}>
                    <strong style={{ color: 'var(--text-main)' }}>Explanation:</strong> {item.explanation}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                className="btn-ghost-pill btn-compact"
                onClick={() => setActiveQuiz(null)}
              >
                Back to Quizzes List
              </button>
              <button
                type="button"
                className="btn-coral-pill btn-compact"
                onClick={() => startQuiz(activeQuiz)}
              >
                <RotateCcw size={14} strokeWidth={1.5} />
                <span>Retake Quiz</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Active Quiz Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em' }}>
              Concept Diagnostic Check
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-main)', margin: '4px 0 0 0' }}>
              {activeQuiz.title}
            </h1>
          </div>
          <button
            type="button"
            className="btn-ghost-pill btn-compact"
            onClick={() => setActiveQuiz(null)}
          >
            Exit Quiz
          </button>
        </div>

        {/* Progress Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            <span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
            <span>{answeredCount} of {totalQuestions} answered</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'var(--surface-muted)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
            <div
              style={{
                width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%`,
                height: '100%',
                background: 'var(--coral)',
                transition: 'width 200ms ease',
              }}
            />
          </div>
        </div>

        {/* Unanswered warning */}
        {showUnansweredWarning && (
          <div
            style={{
              padding: '12px 18px',
              borderRadius: '14px',
              background: 'var(--mastery-developing-soft)',
              border: '1px solid var(--warning-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} strokeWidth={1.5} color="var(--mastery-developing)" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                You have {totalQuestions - answeredCount} unanswered questions. Submit anyway?
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn-coral-pill btn-compact"
                onClick={executeSubmission}
              >
                Confirm Submit
              </button>
              <button
                type="button"
                className="btn-ghost-pill btn-compact"
                onClick={() => setShowUnansweredWarning(false)}
              >
                Go Back
              </button>
            </div>
          </div>
        )}

        {/* Question Card */}
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: '20px',
            border: '1px solid var(--border-hairline)',
            boxShadow: 'var(--shadow-card)',
            padding: '28px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </span>
            <Chip variant="default" size="sm">
              {activeQuiz.conceptName}
            </Chip>
          </div>

          <h2 style={{ fontSize: '16.5px', fontWeight: 600, lineHeight: '1.5', color: 'var(--text-main)', marginBottom: '22px' }}>
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
                    padding: '14px 18px',
                    borderRadius: '12px',
                    border: isSelected ? '1.5px solid var(--coral)' : '1px solid var(--border-hairline)',
                    background: isSelected ? 'var(--coral-soft)' : 'var(--surface-muted)',
                    cursor: 'pointer',
                    transition: 'all 140ms ease',
                  }}
                >
                  <input
                    type="radio"
                    name={`q_${currentQ.id}`}
                    checked={isSelected}
                    onChange={() => handleSelectOption(currentQ.id, optIdx)}
                    style={{ accentColor: 'var(--coral)', width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '13.5px', fontWeight: isSelected ? 600 : 500, color: isSelected ? 'var(--coral)' : 'var(--text-main)' }}>
                    {optionText}
                  </span>
                </label>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '26px', paddingTop: '18px', borderTop: '1px solid var(--border-hairline)' }}>
            <button
              type="button"
              className="btn-ghost-pill btn-compact"
              onClick={handlePrev}
              disabled={currentQuestionIndex === 0}
            >
              <ArrowLeft size={14} strokeWidth={1.5} />
              <span>Previous</span>
            </button>

            {currentQuestionIndex < totalQuestions - 1 ? (
              <button
                type="button"
                className="btn-coral-pill btn-compact"
                onClick={handleNext}
              >
                <span>Next</span>
                <ArrowRight size={14} strokeWidth={1.5} />
              </button>
            ) : (
              <button
                type="button"
                className="btn-coral-pill btn-compact"
                onClick={handleAttemptSubmit}
                disabled={submitting}
              >
                <Check size={14} strokeWidth={2} />
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/home')}>Home</span>
          <span>/</span>
          <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>Practice Quizzes</span>
        </div>
        <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em' }}>
          Curriculum Evaluations
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '-0.01em', margin: '4px 0 0 0' }}>
          Concept Quizzes & Diagnostics
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
          Targeted evaluations calibrated to measure prerequisite concept readiness without guesswork.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '18px' }}>
        {quizzes.map((quiz) => (
          <div
            key={quiz.id}
            style={{
              background: 'var(--surface)',
              borderRadius: '20px',
              border: '1px solid var(--border-hairline)',
              boxShadow: 'var(--shadow-card)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <Chip variant="default" size="sm">{quiz.conceptName}</Chip>
                <Chip variant={quiz.status === 'completed' ? 'success' : 'warning'} size="sm">
                  {quiz.status === 'completed' ? 'Passed' : 'Available'}
                </Chip>
              </div>

              <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
                {quiz.title}
              </h2>
              <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                <span>{quiz.questionsCount} Questions</span>
                <span>&bull;</span>
                <span>~{quiz.estimatedMinutes} mins</span>
              </div>

              {quiz.status === 'completed' && quiz.lastAttemptScore !== null && (
                <div style={{ padding: '8px 12px', background: 'var(--mastery-solid-soft)', borderRadius: '10px', fontSize: '12px', color: 'var(--mastery-solid)', fontWeight: 600, border: '1px solid var(--success-border)' }}>
                  Latest score: {quiz.lastAttemptScore}% ({quiz.lastAttemptDate})
                </div>
              )}
            </div>

            <button
              type="button"
              className="btn-coral-pill btn-compact"
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
