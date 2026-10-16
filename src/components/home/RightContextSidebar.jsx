import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitCommit,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  Code2,
  HelpCircle,
  AlertCircle,
  Layers,
  ChevronRight,
  BookOpen,
  Award,
  Sparkles,
} from 'lucide-react';
import MasteryBadge from '../common/MasteryBadge';
import { normalizeMastery, getMasteryLevel } from '../../utils/mastery';

export function RightContextSidebar({
  recommendation,
  pendingQuizzes = [],
  pendingAssessments = [],
  completedQuizzes = [],
  completedAssessments = [],
  onOpenWhyThis,
}) {
  const navigate = useNavigate();

  const totalPending = pendingQuizzes.length + pendingAssessments.length;
  const totalCompleted = completedQuizzes.length + completedAssessments.length;

  return (
    <aside
      className="home-right-context-sidebar"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        width: '100%',
      }}
      aria-label="Contextual Learning Sidebar"
    >
      {/* 1. PREREQUISITE MASTERY PATH */}
      <div
        className="saas-card"
        style={{
          padding: '18px',
          borderRadius: '12px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            paddingBottom: '10px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={15} color="var(--primary)" />
            <h3 style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
              Prerequisite Mastery Path
            </h3>
          </div>
          {onOpenWhyThis && (
            <button
              type="button"
              onClick={onOpenWhyThis}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--primary)',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                padding: '2px 4px',
              }}
              title="Inspect prerequisite bottleneck breakdown"
            >
              Why this?
            </button>
          )}
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: '1.4' }}>
          Adaptive sequencing for <strong>{recommendation?.conceptName || 'Target Concept'}</strong>
        </p>

        {/* Vertical Prerequisite Chain */}
        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {(recommendation?.prerequisitePath || []).map((step, idx, arr) => {
            const normalized = normalizeMastery(step.score);
            const meta = getMasteryLevel(normalized);
            const isLast = idx === arr.length - 1;

            return (
              <div
                key={step.name || idx}
                style={{
                  display: 'flex',
                  gap: '12px',
                  position: 'relative',
                  paddingBottom: isLast ? '4px' : '16px',
                }}
              >
                {/* Vertical connecting line */}
                {!isLast && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '11px',
                      top: '22px',
                      bottom: '0',
                      width: '2px',
                      background: 'var(--border)',
                      zIndex: 1,
                    }}
                    aria-hidden="true"
                  />
                )}

                {/* Node marker indicator */}
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: step.isTarget
                      ? 'var(--primary)'
                      : step.isWeakest
                      ? '#F59E0B'
                      : meta.color,
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: '800',
                    zIndex: 2,
                    flexShrink: 0,
                    boxShadow: step.isTarget
                      ? '0 0 0 3px rgba(37, 99, 235, 0.2)'
                      : step.isWeakest
                      ? '0 0 0 3px rgba(245, 158, 11, 0.2)'
                      : 'none',
                  }}
                >
                  {normalized >= 70 ? <CheckCircle2 size={13} /> : idx + 1}
                </div>

                {/* Concept details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '12.5px',
                        fontWeight: step.isTarget ? '700' : '600',
                        color: step.isTarget ? 'var(--primary)' : 'var(--text-main)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={step.name}
                    >
                      {step.name}
                    </span>
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: '700',
                        color: meta.textLight,
                        flexShrink: 0,
                      }}
                    >
                      {normalized}%
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: '600',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: meta.bgLight,
                        color: meta.textLight,
                        border: `1px solid ${meta.borderLight}`,
                      }}
                    >
                      {meta.label}
                    </span>
                    {step.isWeakest && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: '700',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: 'rgba(245, 158, 11, 0.14)',
                          color: '#F59E0B',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                        }}
                      >
                        Prerequisite Bottleneck
                      </span>
                    )}
                    {step.isTarget && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: '700',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: 'var(--primary-subtle)',
                          color: 'var(--primary)',
                          border: '1px solid var(--primary-border)',
                        }}
                      >
                        Target
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => navigate('/content/concepts')}
          style={{
            width: '100%',
            marginTop: '12px',
            padding: '7px 12px',
            fontSize: '12px',
            justifyContent: 'center',
          }}
        >
          <span>View Interactive Graph</span>
          <ArrowRight size={13} />
        </button>
      </div>

      {/* 2. UPCOMING PRACTICE QUEUE */}
      <div
        className="saas-card"
        style={{
          padding: '18px',
          borderRadius: '12px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            paddingBottom: '10px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={15} color="var(--primary)" />
            <h3 style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
              Practice Queue
            </h3>
          </div>
          <span className="badge-clean blue" style={{ fontSize: '10.5px' }}>
            {totalPending} Tasks
          </span>
        </div>

        {totalPending === 0 ? (
          <div
            style={{
              padding: '16px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '12px',
              background: 'var(--surface-muted)',
              borderRadius: '8px',
            }}
          >
            All scheduled practice items are completed! Great work.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Quizzes in Queue */}
            {pendingQuizzes.slice(0, 3).map((quiz) => (
              <div
                key={quiz.id}
                style={{
                  padding: '10px 12px',
                  background: 'var(--surface-muted)',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'border-color 140ms ease',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '12.5px',
                      fontWeight: '600',
                      color: 'var(--text-main)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={quiz.title}
                  >
                    {quiz.title}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '2px' }}>
                    {quiz.questions?.length || 5} questions &bull; {quiz.estimatedTime || '8 min'}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => navigate('/content/quizzes')}
                  style={{
                    padding: '5px 10px',
                    fontSize: '11px',
                    flexShrink: 0,
                  }}
                  title="Launch quiz practice"
                >
                  <HelpCircle size={12} />
                  <span>Quiz</span>
                </button>
              </div>
            ))}

            {/* Coding Challenges in Queue */}
            {pendingAssessments.slice(0, 2).map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '10px 12px',
                  background: 'var(--surface-muted)',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'border-color 140ms ease',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '12.5px',
                      fontWeight: '600',
                      color: 'var(--text-main)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={item.title}
                  >
                    {item.title}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '2px' }}>
                    Isolated Sandbox & Viva
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => navigate('/content/coding')}
                  style={{
                    padding: '5px 10px',
                    fontSize: '11px',
                    flexShrink: 0,
                    borderColor: 'var(--primary-border)',
                    color: 'var(--primary)',
                  }}
                  title="Open code sandbox"
                >
                  <Code2 size={12} />
                  <span>Code</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. COMPLETED MILESTONES */}
      <div
        className="saas-card"
        style={{
          padding: '18px',
          borderRadius: '12px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            paddingBottom: '10px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={15} color="#10B981" />
            <h3 style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
              Recent Milestones
            </h3>
          </div>
          <span style={{ fontSize: '11px', color: '#10B981', fontWeight: '700' }}>
            {totalCompleted} Verified
          </span>
        </div>

        {totalCompleted === 0 ? (
          <div
            style={{
              padding: '14px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '12px',
              background: 'var(--surface-muted)',
              borderRadius: '8px',
            }}
          >
            Complete quizzes and code challenges to record verified mastery milestones.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {completedQuizzes.slice(0, 2).map((q) => (
              <div
                key={q.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 10px',
                  background: 'var(--surface-muted)',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  fontSize: '11.5px',
                }}
              >
                <span
                  style={{
                    color: 'var(--text-main)',
                    fontWeight: '500',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '180px',
                  }}
                  title={q.title}
                >
                  {q.title}
                </span>
                <span style={{ color: '#10B981', fontWeight: '700', flexShrink: 0 }}>
                  {normalizeMastery(q.lastAttemptScore || 100)}%
                </span>
              </div>
            ))}

            {completedAssessments.slice(0, 2).map((a) => (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 10px',
                  background: 'var(--surface-muted)',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  fontSize: '11.5px',
                }}
              >
                <span
                  style={{
                    color: 'var(--text-main)',
                    fontWeight: '500',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '180px',
                  }}
                  title={a.title}
                >
                  {a.title}
                </span>
                <span style={{ color: '#10B981', fontWeight: '700', flexShrink: 0 }}>
                  Verified
                </span>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          className="btn-secondary"
          onClick={() => navigate('/progress')}
          style={{
            width: '100%',
            marginTop: '12px',
            padding: '7px 12px',
            fontSize: '12px',
            justifyContent: 'center',
          }}
        >
          <span>View Complete Mastery History</span>
          <ChevronRight size={13} />
        </button>
      </div>
    </aside>
  );
}

export default RightContextSidebar;
