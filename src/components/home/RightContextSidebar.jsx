import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  ArrowRight,
  Flame,
  CheckCircle2,
  BookOpen,
  Code2,
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
  onOpenWhyThis,
}) {
  const navigate = useNavigate();

  // Tasks for session queue
  const sessionTasks = [
    {
      id: 'task-1',
      title: 'Collision Resolution Quiz',
      duration: '8 min',
      points: 25,
      completed: false,
      type: 'Quiz',
      route: '/content/quizzes',
    },
    {
      id: 'task-2',
      title: 'LRU Cache Implementation',
      duration: '25 min',
      points: 50,
      completed: false,
      type: 'Code',
      route: '/content/coding',
    },
    {
      id: 'task-3',
      title: 'Dynamic Arrays Diagnostic',
      duration: '5 min',
      points: 15,
      completed: true,
      type: 'Quiz',
      route: '/content/quizzes',
    },
  ];

  // Prerequisite steps
  const prereqSteps = recommendation?.prerequisitePath || [
    { name: 'Dynamic Arrays & Memory', score: 92, status: 'solid' },
    { name: 'Hash Functions & Distribution', score: 52, status: 'developing' },
    { name: 'Hash Tables & Collision Resolution', score: 48, status: 'developing' },
  ];

  // Related concepts
  const relatedConcepts = [
    {
      id: 'rel-1',
      title: 'Doubly-Linked Lists & Sentinels',
      meta: '4 lessons · 12 exercises',
      gradient: 'linear-gradient(135deg, #FF5B37 0%, #EE4A26 100%)',
    },
    {
      id: 'rel-2',
      title: 'Tree Map Invariants & Balancing',
      meta: '6 lessons · 18 exercises',
      gradient: 'linear-gradient(135deg, #1C1C21 0%, #2C2C34 100%)',
    },
  ];

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
          <ProgressRing progress={48} size={64} strokeWidth={5} color="var(--coral)" />
          <div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--text-main)',
                lineHeight: '1.3',
              }}
            >
              2 of 6 concepts mastered
            </div>
            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                marginTop: '4px',
              }}
            >
              Data Structures & Algorithms
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
            2 pending
          </span>
        }
      >
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
      </RailCard>

      {/* 3. PREREQUISITE PATH */}
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
                  borderRadius: '12px',
                  background: 'var(--surface-muted)',
                  border: '1px solid var(--border-hairline)',
                  gap: '8px',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 500,
                      color: 'var(--text-main)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={step.name}
                  >
                    {step.name}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      marginTop: '1px',
                    }}
                  >
                    {normalized}% estimated mastery
                  </div>
                </div>

                {/* Single status chip per item max */}
                <MasteryChip score={normalized} size="sm" />
              </div>
            );
          })}
        </div>
      </RailCard>

      {/* 4. RELATED CONCEPTS */}
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
              {/* Gradient thumbnail placeholder */}
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
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    marginTop: '2px',
                  }}
                >
                  {item.meta}
                </div>
              </div>

              <ArrowRight size={14} strokeWidth={1.5} color="var(--text-secondary)" />
            </div>
          ))}
        </div>
      </RailCard>
    </aside>
  );
}

export default RightContextSidebar;
