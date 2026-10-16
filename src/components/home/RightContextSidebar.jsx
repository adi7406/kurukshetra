import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  ArrowRight,
  Flame,
  CheckCircle2,
  BookOpen,
  Code2,
  Check,
} from 'lucide-react';
import RailCard from '../common/RailCard';
import ProgressRing from '../common/ProgressRing';
import ChecklistItem from '../common/ChecklistItem';
import MasteryChip from '../common/MasteryChip';
import Chip from '../common/Chip';
import { normalizeMastery } from '../../utils/mastery';

export function RightContextSidebar({
  recommendation,
  pendingQuizzes = [],
  pendingAssessments = [],
  completedQuizzes = [],
  completedAssessments = [],
  totalConcepts = 0,
  masteredConcepts = 0,
  overallProgress = 0,
  courseName = 'Curriculum Sequence',
  onOpenWhyThis,
}) {
  const navigate = useNavigate();

  // Dynamically derive session tasks from live activity props
  const sessionTasks = [
    ...pendingQuizzes.slice(0, 2).map((q) => ({
      id: q.id,
      title: q.title || `${q.conceptName} Quiz`,
      duration: `${q.estimatedMinutes || 10} min`,
      points: 25,
      completed: false,
      type: 'Quiz',
      route: '/content/quizzes',
    })),
    ...pendingAssessments.slice(0, 2).map((a) => ({
      id: a.id,
      title: a.title,
      duration: '25 min',
      points: 50,
      completed: false,
      type: 'Code',
      route: '/content/coding',
    })),
    ...completedQuizzes.slice(0, 1).map((q) => ({
      id: `done_${q.id}`,
      title: q.title || `${q.conceptName} Diagnostic`,
      duration: '5 min',
      points: 15,
      completed: true,
      type: 'Quiz',
      route: '/content/quizzes',
    })),
  ];

  // Dynamic prerequisite steps
  const prereqSteps = recommendation?.prerequisitePath || [];

  const normalizedProgress = normalizeMastery(overallProgress);

  return (
    <aside
      className="home-workspace-sidebar"
      aria-label="Contextual Learning Sidebar"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
      }}
    >
      {/* 1. COURSE PROGRESS CARD */}
      <RailCard title="Course Progress">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <ProgressRing progress={normalizedProgress} size={64} strokeWidth={5} color="var(--coral)" />
          <div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--text-main)',
                lineHeight: '1.3',
              }}
            >
              {totalConcepts > 0
                ? `${masteredConcepts} of ${totalConcepts} concepts mastered`
                : 'No concepts recorded yet'}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                marginTop: '4px',
              }}
            >
              {courseName}
            </div>
          </div>
        </div>
      </RailCard>

      {/* 2. SESSION TASKS / PRACTICE QUEUE */}
      <RailCard
        title="Session Tasks"
        action={
          <span
            style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
              fontWeight: 500,
            }}
          >
            {pendingQuizzes.length + pendingAssessments.length} pending
          </span>
        }
      >
        {sessionTasks.length === 0 ? (
          <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
            ✓ No tasks pending in queue.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sessionTasks.map((task) => (
              <ChecklistItem
                key={task.id}
                title={task.title}
                duration={task.duration}
                points={task.points}
                completed={task.completed}
                actionLabel={task.type}
                onAction={() => navigate(task.route)}
              />
            ))}
          </div>
        )}
      </RailCard>

      {/* 3. PREREQUISITE PATH */}
      {prereqSteps.length > 0 && (
        <RailCard
          title="Prerequisite Path"
          action={
            onOpenWhyThis && (
              <button
                type="button"
                onClick={onOpenWhyThis}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--coral)',
                  fontSize: '11.5px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Why this?
              </button>
            )
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {prereqSteps.map((step, idx) => {
              const normalized = normalizeMastery(step.score);
              return (
                <div
                  key={step.name || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    background: step.isTarget ? 'var(--coral-soft)' : 'var(--surface-muted)',
                    border: step.isTarget ? '1px solid var(--coral-border)' : '1px solid var(--border-hairline)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background:
                          normalized >= 70
                            ? 'var(--mastery-solid)'
                            : normalized >= 40
                            ? 'var(--mastery-developing)'
                            : 'var(--mastery-weak)',
                      }}
                    />
                    <span
                      style={{
                        fontSize: '12.5px',
                        fontWeight: step.isTarget ? 600 : 500,
                        color: step.isTarget ? 'var(--coral)' : 'var(--text-main)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={step.name}
                    >
                      {step.name}
                    </span>
                  </div>
                  <MasteryChip score={normalized} size="sm" />
                </div>
              );
            })}
          </div>
        </RailCard>
      )}
    </aside>
  );
}

export default RightContextSidebar;
