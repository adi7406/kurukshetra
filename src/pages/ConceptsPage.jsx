import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { learningService } from '../services/learningService';
import LoadingState from '../components/feedback/LoadingState';
import MasteryChip from '../components/common/MasteryChip';
import Chip from '../components/common/Chip';
import { normalizeMastery } from '../utils/mastery';
import { ConceptDiagram } from '../components/common/ConceptDiagram';

export function ConceptsPage() {
  const navigate = useNavigate();
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
        setCourses(data || []);
      } catch (err) {
        console.error('Failed to load courses:', err);
      } finally {
        setLoading(false);
      }
    }
    loadConcepts();
  }, []);

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
          {primaryCourse?.code}: {primaryCourse?.title} &bull; Instructor: {primaryCourse?.instructor}
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {primaryCourse?.modules?.map((module) => {
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

              {/* 1. Deep Text Theory */}
              {selectedConcept.theory && (
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
              )}

              {/* 2. Visual Diagram */}
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em', marginBottom: '6px' }}>
                  2. Memory Layout & Architectural Diagram
                </div>
                <ConceptDiagram conceptName={selectedConcept.name} />
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
            </div>

            <div style={{ padding: '14px 22px', background: 'var(--surface-muted)', borderTop: '1px solid var(--border-hairline)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn-ghost-pill btn-compact"
                onClick={() => {
                  setSelectedConcept(null);
                  navigate('/content/quizzes');
                }}
              >
                <HelpCircle size={13} strokeWidth={1.5} />
                <span>Take Quiz</span>
              </button>
              <button
                type="button"
                className="btn-coral-pill btn-compact"
                onClick={() => {
                  setSelectedConcept(null);
                  navigate('/content/coding');
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
