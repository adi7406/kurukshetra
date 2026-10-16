import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, ArrowRight } from 'lucide-react';
import MasteryChip from '../common/MasteryChip';
import { normalizeMastery } from '../../utils/mastery';

export function MiniConceptMap({ concepts = [], activeConceptId }) {
  const navigate = useNavigate();

  if (!concepts || concepts.length === 0) {
    return (
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-hairline)',
          borderRadius: '20px',
          boxShadow: 'var(--shadow-card)',
          padding: '24px',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: '13px',
        }}
      >
        Curriculum concept path is empty. Publish a course syllabus to track your progression.
      </div>
    );
  }

  // Top sequential concepts
  const displayConcepts = concepts.slice(0, 5);

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-hairline)',
        borderRadius: '20px',
        boxShadow: 'var(--shadow-card)',
        padding: '20px 24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '11.5px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--text-secondary)',
              marginBottom: '2px',
            }}
          >
            Concept Path
          </div>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--text-main)',
              margin: 0,
            }}
          >
            Curriculum Sequence
          </h3>
        </div>

        <button
          type="button"
          className="btn-ghost-pill btn-compact"
          onClick={() => navigate('/content/concepts')}
        >
          <span>Full Concept Graph</span>
          <ArrowRight size={13} strokeWidth={1.5} />
        </button>
      </div>

      {/* Horizontal Scroller of Rounded Step Cards with Arrows */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          overflowX: 'auto',
          padding: '6px 2px 14px 2px',
        }}
        tabIndex={0}
        aria-label="Horizontal prerequisite concept path"
      >
        {displayConcepts.map((c, index) => {
          const rawScore = c.masteryScore ?? c.mastery ?? 0;
          const normalizedScore = normalizeMastery(rawScore);
          const isTarget = c.id === activeConceptId || (activeConceptId ? false : index === 0);
          const isLast = index === displayConcepts.length - 1;

          return (
            <React.Fragment key={c.id || index}>
              <div
                onClick={() => navigate(`/content/concepts`)}
                title={`${c.name || c.title}: ${normalizedScore}%`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/content/concepts`);
                  }
                }}
                style={{
                  flexShrink: 0,
                  width: '190px',
                  padding: '16px',
                  borderRadius: '16px',
                  background: isTarget ? 'var(--coral-soft)' : 'var(--surface-muted)',
                  border: isTarget ? '2px solid var(--coral)' : '1px solid var(--border-hairline)',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
                onMouseEnter={(e) => {
                  if (!isTarget) e.currentTarget.style.borderColor = 'var(--coral)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  if (!isTarget) e.currentTarget.style.borderColor = 'var(--border-hairline)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Recommended step has a Next pill */}
                {isTarget && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-10px',
                      left: '14px',
                      background: 'var(--coral)',
                      color: '#FFFFFF',
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-pill)',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      boxShadow: '0 2px 6px rgba(255, 91, 55, 0.3)',
                    }}
                  >
                    Next
                  </div>
                )}

                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    lineHeight: '1.4',
                    minHeight: '36px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {c.name || c.title || `Concept Module ${index + 1}`}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <MasteryChip score={normalizedScore} size="sm" />
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text-main)',
                    }}
                  >
                    {normalizedScore}%
                  </span>
                </div>
              </div>

              {/* Arrow between step cards */}
              {!isLast && (
                <div
                  style={{
                    color: 'var(--text-secondary)',
                    opacity: 0.6,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  aria-hidden="true"
                >
                  <ArrowRight size={16} strokeWidth={1.5} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default MiniConceptMap;
