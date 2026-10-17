import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
  Bookmark,
  Flag,
  Filter,
} from 'lucide-react';
import { learningService } from '../services/learningService';
import LoadingState from '../components/feedback/LoadingState';
import EmptyState from '../components/feedback/EmptyState';
import Chip from '../components/common/Chip';
import MasteryChip from '../components/common/MasteryChip';

export function QuizPage() {
  const { quizId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const conceptParam = searchParams.get('conceptId') || searchParams.get('topicId');
  const targetQuizId = quizId || searchParams.get('quizId');

  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [topicFilter, setTopicFilter] = useState('all');

  // Active quiz attempt state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState({});
  const [showUnansweredWarning, setShowUnansweredWarning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attemptResult, setAttemptResult] = useState(null);

  // Countdown timer state
  const [secondsRemaining, setSecondsRemaining] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    loadQuizzes();
  }, [quizId, conceptParam, targetQuizId]);

  async function loadQuizzes() {
    try {
      setLoading(true);
      const data = await learningService.getQuizzes();
      const quizList = data || [];
      setQuizzes(quizList);

      if (quizList.length > 0) {
        let target = null;
        if (targetQuizId) {
          target = quizList.find((q) => q.id === targetQuizId);
        } else if (conceptParam) {
          target = quizList.find(
            (q) =>
              q.conceptId === conceptParam ||
              q.topicId === conceptParam ||
              (q.conceptName && q.conceptName.toLowerCase().includes(conceptParam.toLowerCase())) ||
              (q.title && q.title.toLowerCase().includes(conceptParam.toLowerCase()))
          );
        }
        if (target) {
          startQuiz(target);
        }
      }
    } catch (err) {
      console.error('Failed to load quizzes:', err);
    } finally {
      setLoading(false);
    }
  }

  // Timer lifecycle
  useEffect(() => {
    if (activeQuiz && activeQuiz.durationSeconds && !attemptResult) {
      setSecondsRemaining(activeQuiz.durationSeconds);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            clearInterval(timerRef.current);
            executeSubmission();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeQuiz, attemptResult]);

  const startQuiz = (quiz) => {
    setActiveQuiz(quiz);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setMarkedForReview({});
    setShowUnansweredWarning(false);
    setAttemptResult(null);
    if (quiz.durationSeconds) {
      setSecondsRemaining(quiz.durationSeconds);
    }
  };

  const handleSelectOption = (questionId, optionIndex) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const toggleMarkForReview = (questionId) => {
    setMarkedForReview((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
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

  async function executeSubmission() {
    setShowUnansweredWarning(false);
    if (timerRef.current) clearInterval(timerRef.current);
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

  const formatTimer = (totalSecs) => {
    if (totalSecs === null || totalSecs === undefined) return '';
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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
    const isFlagged = Boolean(markedForReview[currentQ?.id]);
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
                <div style={{ fontSize: '28px', fontWeight: 700, color: attemptResult.passed ? 'var(--mastery-solid)' : 'var(--coral)' }}>
                  {attemptResult.score}%
                </div>
                <Chip variant={attemptResult.passed ? 'success' : 'danger'} size="sm">
                  {attemptResult.passed ? 'Benchmark Achieved' : 'Review Recommended'}
                </Chip>
              </div>
            </div>

            <div style={{ padding: '16px', background: 'var(--surface-muted)', borderRadius: '14px', marginBottom: '24px', display: 'flex', justifyContent: 'space-around', textAlign: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Correct Answers</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                  {attemptResult.correctCount} / {attemptResult.totalCount}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Score by Marks</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--coral)' }}>
                  {attemptResult.marksEarned !== undefined ? attemptResult.marksEarned : (attemptResult.correctCount * 10)} / {attemptResult.totalMarks || (attemptResult.totalCount * 10)} marks
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Accuracy</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                  {attemptResult.score}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Passing Score</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                  {activeQuiz.passingScore || 70}%
                </div>
              </div>
            </div>

            {/* Questions Breakdown */}
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '16px' }}>
              Concept-Level Performance Breakdown
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {attemptResult.details?.map((detail, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '16px',
                    borderRadius: '14px',
                    border: `1.5px solid ${detail.isCorrect ? 'rgba(74, 184, 138, 0.3)' : 'rgba(255, 91, 55, 0.3)'}`,
                    background: detail.isCorrect ? 'rgba(74, 184, 138, 0.05)' : 'rgba(255, 91, 55, 0.05)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-main)' }}>
                      Question {idx + 1}: {detail.prompt}
                    </span>
                    <Chip variant={detail.isCorrect ? 'success' : 'danger'} size="sm">
                      {detail.isCorrect ? 'Correct' : 'Incorrect'}
                    </Chip>
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', marginTop: '6px' }}>
                    <strong>Explanation:</strong> {detail.explanation}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button
                type="button"
                className="btn-ghost-pill"
                onClick={() => startQuiz(activeQuiz)}
              >
                <RotateCcw size={14} strokeWidth={1.5} />
                <span>Retake Quiz</span>
              </button>
              <button
                type="button"
                className="btn-coral-pill"
                onClick={() => {
                  setActiveQuiz(null);
                  navigate('/progress');
                }}
              >
                <span>View Progress</span>
                <ArrowRight size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Navigation Breadcrumb & Timer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <span style={{ cursor: 'pointer' }} onClick={() => navigate('/home')}>Home</span>
            <span>/</span>
            <span style={{ cursor: 'pointer' }} onClick={() => setActiveQuiz(null)}>Quizzes</span>
            <span>/</span>
            <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{activeQuiz.title}</span>
          </div>

          {secondsRemaining !== null && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: 'var(--radius-pill)',
                background: secondsRemaining < 60 ? 'var(--coral-soft)' : 'var(--surface-muted)',
                color: secondsRemaining < 60 ? 'var(--coral)' : 'var(--text-main)',
                fontWeight: 600,
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                border: '1px solid var(--border-hairline)',
              }}
            >
              <Clock size={13} strokeWidth={2} />
              <span>{formatTimer(secondsRemaining)}</span>
            </div>
          )}
        </div>

        {/* Question Palette / Navigation Grid */}
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: '16px',
            border: '1px solid var(--border-hairline)',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {questions.map((q, idx) => {
              const isQAnswered = selectedAnswers[q.id] !== undefined;
              const isQFlagged = Boolean(markedForReview[q.id]);
              const isQActive = idx === currentQuestionIndex;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentQuestionIndex(idx)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: isQActive ? '2px solid var(--coral)' : '1px solid var(--border-hairline)',
                    background: isQFlagged
                      ? 'rgba(235, 174, 53, 0.2)'
                      : isQAnswered
                      ? 'var(--coral-soft)'
                      : 'var(--surface-muted)',
                    color: isQFlagged
                      ? '#EBAE35'
                      : isQAnswered
                      ? 'var(--coral)'
                      : 'var(--text-secondary)',
                    transition: 'all 150ms ease',
                  }}
                  title={`Question ${idx + 1}${isQFlagged ? ' (Marked for review)' : isQAnswered ? ' (Answered)' : ''}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Answered: <strong>{answeredCount}</strong> / {totalQuestions}
          </div>
        </div>

        {/* Active Question Card */}
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: '20px',
            border: '1px solid var(--border-hairline)',
            boxShadow: 'var(--shadow-card)',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em' }}>
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </span>

            <button
              type="button"
              onClick={() => toggleMarkForReview(currentQ.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--border-hairline)',
                background: isFlagged ? 'rgba(235, 174, 53, 0.15)' : 'transparent',
                color: isFlagged ? '#EBAE35' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <Flag size={12} fill={isFlagged ? '#EBAE35' : 'none'} />
              <span>{isFlagged ? 'Marked for Review' : 'Mark for Review'}</span>
            </button>
          </div>

          <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-main)', margin: 0, lineHeight: '1.5' }}>
            {currentQ?.prompt}
          </h2>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {currentQ?.options?.map((opt, oIdx) => {
              const isSelected = selectedAnswers[currentQ.id] === oIdx;
              const optText = typeof opt === 'string' ? opt : opt.text;

              return (
                <div
                  key={oIdx}
                  onClick={() => handleSelectOption(currentQ.id, oIdx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 18px',
                    borderRadius: '12px',
                    border: `1.5px solid ${isSelected ? 'var(--coral)' : 'var(--border-hairline)'}`,
                    background: isSelected ? 'var(--coral-soft)' : 'var(--surface-muted)',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                >
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: `2px solid ${isSelected ? 'var(--coral)' : 'var(--border-hairline)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isSelected ? 'var(--coral)' : 'transparent',
                    }}
                  >
                    {isSelected && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FFFFFF' }} />}
                  </div>
                  <span style={{ fontSize: '13.5px', color: 'var(--text-main)', fontWeight: isSelected ? 500 : 400 }}>
                    {optText}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border-hairline)' }}>
            <button
              type="button"
              className="btn-ghost-pill btn-compact"
              onClick={handlePrev}
              disabled={currentQuestionIndex === 0}
            >
              <ArrowLeft size={13} strokeWidth={1.5} />
              <span>Previous</span>
            </button>

            {currentQuestionIndex < totalQuestions - 1 ? (
              <button
                type="button"
                className="btn-coral-pill btn-compact"
                onClick={handleNext}
              >
                <span>Next</span>
                <ArrowRight size={13} strokeWidth={1.5} />
              </button>
            ) : (
              <button
                type="button"
                className="btn-coral-pill btn-compact"
                onClick={handleAttemptSubmit}
                disabled={submitting}
              >
                <span>{submitting ? 'Submitting...' : 'Submit Assessment'}</span>
                <CheckCircle2 size={13} strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>

        {/* Unanswered Questions Warning Modal */}
        {showUnansweredWarning && (
          <div className="modal-overlay" onClick={() => setShowUnansweredWarning(false)}>
            <div
              className="modal-dialog-card animate-fade-in"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '440px', padding: '24px', textAlign: 'center' }}
            >
              <AlertTriangle size={36} strokeWidth={1.5} color="var(--coral)" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 8px 0' }}>
                Unanswered Questions
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 20px 0' }}>
                You have {totalQuestions - answeredCount} unanswered question(s). Are you sure you want to finalize your submission?
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="btn-ghost-pill btn-compact"
                  onClick={() => setShowUnansweredWarning(false)}
                >
                  Review Answers
                </button>
                <button
                  type="button"
                  className="btn-coral-pill btn-compact"
                  onClick={executeSubmission}
                >
                  Submit Anyway
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // QUIZ LISTING SCREEN
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
          Bloom Diagnostic Quizzes
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '-0.01em', margin: '4px 0 0 0' }}>
          Topic Diagnostic Quizzes
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
          Assess your comprehension of prerequisite concepts with 5 comprehensive diagnostic questions per topic.
        </p>
      </div>

      {/* Topic Filter Bar */}
      {quizzes.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className={topicFilter === 'all' ? 'btn-coral-pill btn-compact' : 'btn-ghost-pill btn-compact'}
            onClick={() => setTopicFilter('all')}
          >
            All Topics ({quizzes.length})
          </button>
          {Array.from(new Set(quizzes.map((q) => q.conceptName).filter(Boolean))).map((t) => (
            <button
              key={t}
              type="button"
              className={topicFilter === t ? 'btn-coral-pill btn-compact' : 'btn-ghost-pill btn-compact'}
              onClick={() => setTopicFilter(t)}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {quizzes.length === 0 ? (
        <EmptyState
          title="No Quizzes Available"
          description="Diagnostic quizzes will appear here once the curriculum syllabus is ingested and published by the instructor."
          actionLabel="Return Home"
          onAction={() => navigate('/home')}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
          {quizzes.filter((q) => topicFilter === 'all' || q.conceptName === topicFilter || q.conceptId === topicFilter).map((quiz) => (
            <div
              key={quiz.id}
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
                  <Chip variant="default" size="sm">{quiz.conceptName || 'Topic Concept'}</Chip>
                  {quiz.status === 'completed' && (
                    <Chip variant="success" size="sm">
                      Completed &bull; {quiz.lastAttemptScore}%
                    </Chip>
                  )}
                </div>

                <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
                  {quiz.title}
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                  {quiz.description}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '14px', borderTop: '1px solid var(--border-hairline)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {quiz.questionsCount || quiz.questions?.length || 5} questions &bull; {quiz.timeLimit || '10 mins'}
                </span>
                <button
                  type="button"
                  className="btn-coral-pill btn-compact"
                  onClick={() => startQuiz(quiz)}
                >
                  <HelpCircle size={13} strokeWidth={1.5} />
                  <span>{quiz.status === 'completed' ? 'Retake' : 'Start Quiz'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default QuizPage;
