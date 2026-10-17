import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Lock,
  CheckCircle2,
  Clock,
  BookOpen,
  HelpCircle,
  Code2,
  ArrowRight,
  Layers,
  X,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';
import { learningService } from '../services/learningService';
import LoadingState from '../components/feedback/LoadingState';
import EmptyState from '../components/feedback/EmptyState';
import MasteryChip from '../components/common/MasteryChip';
import Chip from '../components/common/Chip';
import { normalizeMastery } from '../utils/mastery';
import { ConceptDiagram } from '../components/common/ConceptDiagram';

export function ConceptsPage() {
  const navigate = useNavigate();
  const { conceptId } = useParams();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedConcept, setSelectedConcept] = useState(null);

  useEffect(() => {
    async function loadConcepts() {
      try {
        setLoading(true);
        const data = await learningService.getCourses();
        const courseList = data || [];
        setCourses(courseList);

        // If conceptId passed in route parameter, auto-open matching concept
        if (conceptId) {
          for (const c of courseList) {
            for (const m of c.modules || []) {
              const matched = (m.concepts || []).find((con) => con.id === conceptId);
              if (matched) {
                setSelectedConcept(matched);
                break;
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to load courses:', err);
      } finally {
        setLoading(false);
      }
    }
    loadConcepts();
  }, [conceptId]);

  if (loading) {
    return <LoadingState message="Loading syllabus concept graph..." />;
  }

  const primaryCourse = courses[0];

  const filterConcept = (concept) => {
    const matchesSearch =
      concept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      concept.description?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'mastered') return concept.status === 'mastered';
    if (statusFilter === 'developing') return concept.status === 'developing';
    if (statusFilter === 'needs_practice') return concept.status === 'needs_practice';
    if (statusFilter === 'locked') return concept.status === 'locked';

    return true;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Breadcrumb & Title */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/home')}>Home</span>
          <span>/</span>
          <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>Concept Map</span>
        </div>
        <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em' }}>
          Curriculum Prerequisite Graph
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '-0.01em', margin: '4px 0 0 0' }}>
          Curriculum Concepts & Prerequisite Tree
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
          {primaryCourse ? `${primaryCourse?.code}: ${primaryCourse?.title} • Instructor: ${primaryCourse?.instructor}` : 'Interactive Prerequisite Graph & Adaptive Concept Progression'}
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: '20px',
          border: '1px solid var(--border-hairline)',
          boxShadow: 'var(--shadow-card)',
          padding: '16px 20px',
          display: 'flex',
          gap: '14px',
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
        }}
      >
        <div className="search-pill-container" style={{ maxWidth: '360px' }}>
          <Search size={15} strokeWidth={1.5} color="var(--text-secondary)" />
          <input
            type="text"
            className="search-pill-input"
            placeholder="Search concepts or learning objectives..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={14} strokeWidth={1.5} color="var(--text-secondary)" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--border-hairline)',
              backgroundColor: 'var(--surface)',
              color: 'var(--text-main)',
              fontSize: '12.5px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Statuses</option>
            <option value="mastered">Solid (&gt;70%)</option>
            <option value="developing">Developing (40-70%)</option>
            <option value="needs_practice">Weak (&lt;40%)</option>
            <option value="locked">Locked (Prerequisites Unmet)</option>
          </select>
        </div>
      </div>

      {/* Modules & Concepts Grid */}
      {!primaryCourse || !primaryCourse.modules || primaryCourse.modules.length === 0 ? (
        <div style={{ background: 'var(--surface)', borderRadius: '20px', border: '1px solid var(--border-hairline)', padding: '36px', textAlign: 'center' }}>
          <EmptyState
            title="No Course Concepts Available"
            description="No course syllabus has been published yet. Once connected to the live backend API or when an instructor uploads a syllabus in the studio, curriculum concepts will appear here."
            actionLabel="Go to Syllabus Studio"
            onAction={() => navigate('/teacher/content-upload')}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {primaryCourse.modules.map((module) => {
            const visibleConcepts = module.concepts.filter(filterConcept);
            if (visibleConcepts.length === 0 && searchQuery) return null;

          return (
            <div
              key={module.id}
              style={{
                background: 'var(--surface)',
                borderRadius: '20px',
                border: '1px solid var(--border-hairline)',
                boxShadow: 'var(--shadow-card)',
                padding: '24px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                  {module.title}
                </h2>
                <Chip variant="default" size="sm">
                  {visibleConcepts.length} Concepts
                </Chip>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                {visibleConcepts.map((concept) => {
                  const isLocked = concept.status === 'locked';
                  const score = normalizeMastery(Math.round(concept.masteryScore * 100));

                  return (
                    <div
                      key={concept.id}
                      style={{
                        padding: '18px',
                        borderRadius: '16px',
                        border: '1px solid var(--border-hairline)',
                        background: isLocked ? 'var(--surface-muted)' : 'var(--surface)',
                        opacity: isLocked ? 0.75 : 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '14px',
                        transition: 'all 150ms ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isLocked) {
                          e.currentTarget.style.borderColor = 'var(--coral)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isLocked) {
                          e.currentTarget.style.borderColor = 'var(--border-hairline)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          {isLocked ? (
                            <Chip variant="default" size="sm">
                              <Lock size={11} strokeWidth={1.5} style={{ marginRight: '4px' }} />
                              Locked
                            </Chip>
                          ) : (
                            <MasteryChip score={score} size="sm" />
                          )}

                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                            {score}% Estimated
                          </span>
                        </div>

                        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
                          {concept.name}
                        </h3>

                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                          {concept.description}
                        </p>

                        {isLocked && concept.lockReason && (
                          <div style={{ marginTop: '10px', padding: '8px 12px', background: 'var(--mastery-weak-soft)', border: '1px solid var(--danger-border)', borderRadius: '10px', fontSize: '12px', color: 'var(--mastery-weak)' }}>
                            {concept.lockReason}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                        {isLocked ? (
                          <button type="button" className="btn-ghost-pill btn-compact" style={{ width: '100%', opacity: 0.6 }} disabled>
                            Prerequisite Unmet
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn-coral-pill btn-compact"
                              style={{ flex: 1 }}
                              onClick={() => setSelectedConcept(concept)}
                            >
                              <span>Learn Theory</span>
                              <BookOpen size={13} strokeWidth={1.5} />
                            </button>
                            <button
                              type="button"
                              className="btn-ghost-pill btn-compact"
                              onClick={() => navigate('/content/quizzes')}
                            >
                              <span>Quiz</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    )}

      {/* Theory & Objectives Modal */}
      {selectedConcept && (
        <div className="modal-overlay" onClick={() => setSelectedConcept(null)}>
          <div
            className="modal-dialog-card animate-fade-in"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '600px', borderRadius: '20px', border: '1px solid var(--border-hairline)' }}
          >
            <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border-hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em' }}>
                  Concept Invariants
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', margin: '2px 0 0 0' }}>
                  {selectedConcept.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedConcept(null)}
                className="icon-btn-circle"
                style={{ width: '32px', height: '32px' }}
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <div style={{ padding: '22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '13.5px', color: 'var(--text-main)', lineHeight: '1.6', margin: 0 }}>
                {selectedConcept.description}
              </p>

              {/* Learning Objectives */}
              {selectedConcept.learningObjectives?.length > 0 && (
                <div>
                  <div style={{ fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em', marginBottom: '8px' }}>
                    Learning Objectives:
                  </div>
                  <ul style={{ paddingLeft: '18px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                    {selectedConcept.learningObjectives.map((obj, i) => (
                      <li key={i}>{obj}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Typed Sections (text, heading, list, code, callout, diagram) */}
              {Array.isArray(selectedConcept.sections) && selectedConcept.sections.length > 0 ? (
                selectedConcept.sections.map((sec, idx) => (
                  <div key={sec.id || idx}>
                    {sec.title && (
                      <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em', marginBottom: '6px' }}>
                        {sec.title}
                      </div>
                    )}
                    {sec.type === 'text' && (
                      <div style={{ padding: '14px 16px', background: 'var(--surface-muted)', borderRadius: '12px', border: '1px solid var(--border-hairline)', fontSize: '13px', lineHeight: '1.6' }}>
                        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0, color: 'var(--text-main)' }}>
                          {sec.content}
                        </pre>
                      </div>
                    )}
                    {sec.type === 'code' && (
                      <div style={{ padding: '14px 16px', background: '#16161A', color: '#ECEAE8', borderRadius: '12px', fontFamily: 'var(--font-mono, monospace)', fontSize: '12px', lineHeight: '1.5', overflowX: 'auto' }}>
                        <pre style={{ margin: 0, whiteSpace: 'pre' }}>{sec.content}</pre>
                      </div>
                    )}
                    {sec.type === 'callout' && (
                      <div style={{ padding: '12px 16px', background: sec.calloutVariant === 'warning' ? 'var(--mastery-developing-soft)' : 'var(--coral-soft)', border: '1px solid var(--border-hairline)', borderRadius: '12px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <Lightbulb size={16} color="var(--coral)" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span style={{ fontSize: '12.5px', color: 'var(--text-main)', lineHeight: '1.5' }}>{sec.content}</span>
                      </div>
                    )}
                    {sec.type === 'list' && Array.isArray(sec.items) && (
                      <ul style={{ paddingLeft: '18px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                        {sec.items.map((it, i) => (
                          <li key={i}>{it}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))
              ) : (
                /* Fallback 1. Deep Text Theory */
                selectedConcept.theory && (
                  <div>
                    <div style={{ fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em', marginBottom: '6px' }}>
                      1. Invariant Theory & Mechanics
                    </div>
                    <div style={{ padding: '16px', background: 'var(--surface-muted)', borderRadius: '14px', border: '1px solid var(--border-hairline)', fontSize: '13px', lineHeight: '1.6' }}>
                      <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0, color: 'var(--text-main)' }}>
                        {selectedConcept.theory}
                      </pre>
                    </div>
                  </div>
                )
              )}

              {/* 2. Visual Diagram */}
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em', marginBottom: '6px' }}>
                  2. Memory Layout & Architectural Diagram
                </div>
                <ConceptDiagram conceptName={selectedConcept.name} diagram={selectedConcept.diagram} />
              </div>

              {/* 3. Executable Code Example */}
              {selectedConcept.example && (
                <div>
                  <div style={{ fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em', marginBottom: '6px' }}>
                    3. Executable Code Implementation
                  </div>
                  <div style={{ padding: '14px 16px', background: '#16161A', color: '#ECEAE8', borderRadius: '14px', fontFamily: 'var(--font-mono, monospace)', fontSize: '12px', lineHeight: '1.5', overflowX: 'auto', maxHeight: '250px', overflowY: 'auto' }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre' }}>{selectedConcept.example}</pre>
                  </div>
                </div>
              )}

              {/* Key Takeaways */}
              {Array.isArray(selectedConcept.keyTakeaways) && selectedConcept.keyTakeaways.length > 0 && (
                <div>
                  <div style={{ fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--mastery-solid)', letterSpacing: '0.04em', marginBottom: '6px' }}>
                    Key Takeaways:
                  </div>
                  <ul style={{ paddingLeft: '18px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                    {selectedConcept.keyTakeaways.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Misconceptions & Pitfalls */}
              {Array.isArray(selectedConcept.misconceptions) && selectedConcept.misconceptions.length > 0 && (
                <div style={{ padding: '12px 14px', background: 'var(--mastery-developing-soft)', border: '1px solid var(--warning-border)', borderRadius: '12px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <AlertCircle size={15} color="var(--warning-text)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--warning-text)', letterSpacing: '0.04em', marginBottom: '4px' }}>
                      Common Pitfalls & Misconceptions:
                    </div>
                    <ul style={{ paddingLeft: '16px', fontSize: '12.5px', color: 'var(--text-main)', margin: 0, lineHeight: '1.45' }}>
                      {selectedConcept.misconceptions.map((mis, i) => (
                        <li key={i}>{mis}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '14px 22px', background: 'var(--surface-muted)', borderTop: '1px solid var(--border-hairline)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn-ghost-pill btn-compact"
                onClick={() => {
                  const targetConceptId = selectedConcept.id;
                  setSelectedConcept(null);
                  navigate(`/content/quizzes?conceptId=${targetConceptId}`);
                }}
              >
                <HelpCircle size={13} strokeWidth={1.5} />
                <span>Take Quiz</span>
              </button>
              <button
                type="button"
                className="btn-coral-pill btn-compact"
                onClick={() => {
                  const targetConceptId = selectedConcept.id;
                  setSelectedConcept(null);
                  navigate(`/content/coding?conceptId=${targetConceptId}`);
                }}
              >
                <Code2 size={13} strokeWidth={1.5} />
                <span>Coding Problem</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConceptsPage;
