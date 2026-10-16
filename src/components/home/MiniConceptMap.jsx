import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, ArrowRight } from 'lucide-react';
import { getMasteryLevel, normalizeMastery } from '../../utils/mastery';

export function MiniConceptMap({ concepts = [], activeConceptId }) {
  const navigate = useNavigate();

  // Pick top key concepts if list is long (up to 5)
  const displayConcepts = concepts.slice(0, 5);

  return (
    <div className="saas-card" style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={16} color="var(--primary)" />
          <div>
            <h3 style={{ fontSize: '14.5px', fontWeight: '700' }}>Concept Prerequisite Path</h3>
            <p style={{ fontSize: '11.5px', color: 'var(--text-light)', marginTop: '1px' }}>
              Sequential dependency flow & mastery states
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => navigate('/content/concepts')}
          style={{ padding: '5px 12px', fontSize: '12px' }}
        >
          <span>Open Full Graph</span>
          <ArrowRight size={13} />
        </button>
      </div>

      {/* Interactive Horizontal Concept Flow Line */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          padding: '6px 2px 10px 2px',
        }}
        tabIndex={0}
        aria-label="Horizontal prerequisite concept path"
      >
        {displayConcepts.map((c, index) => {
          const rawScore = c.masteryScore ?? c.mastery ?? (index === 0 ? 0.94 : index === 1 ? 0.72 : index === 2 ? 0.48 : index === 3 ? 0.86 : 0.38);
          const normalizedScore = normalizeMastery(rawScore);
          const meta = getMasteryLevel(normalizedScore);
          const isTarget = c.id === activeConceptId || index === 2;

          return (
            <React.Fragment key={c.id || index}>
              <div
                onClick={() => navigate(`/content/concepts`)}
                title={`${c.name || c.title}: ${normalizedScore}% · ${meta.label}`}
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
                  width: '185px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: isTarget ? 'rgba(37, 99, 235, 0.08)' : 'var(--surface-muted)',
                  border: isTarget ? '2px solid var(--primary)' : '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'border-color 140ms ease, transform 140ms ease',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isTarget ? 'var(--primary)' : 'var(--border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {isTarget && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-9px',
                      left: '10px',
                      background: 'var(--primary)',
                      color: '#FFFFFF',
                      fontSize: '9px',
                      fontWeight: '800',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Recommended
                  </div>
                )}

                <div
                  style={{
                    fontSize: '12.5px',
                    fontWeight: '700',
                    color: 'var(--text-main)',
                    lineHeight: '1.35',
                    height: '34px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {c.name || c.title}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: '500' }}>
                    Step {index + 1}
                  </span>
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: '700',
                      color: meta.textLight,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: meta.color,
                        flexShrink: 0,
                      }}
                      aria-hidden="true"
                    />
                    <span>{meta.score}% · {meta.label}</span>
                  </span>
                </div>
              </div>

              {index < displayConcepts.length - 1 && (
                <div
                  style={{
                    color: 'var(--text-light)',
                    display: 'flex',
                    alignItems: 'center',
                    flexShrink: 0,
                    padding: '0 2px',
                  }}
                  aria-hidden="true"
                >
                  <ArrowRight size={14} />
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
