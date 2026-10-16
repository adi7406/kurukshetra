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
  Sparkles,
} from 'lucide-react';
import { learningService } from '../services/learningService';
import LoadingState from '../components/feedback/LoadingState';

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
        setCourses(data);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title */}
      <div>
        <div className="hero-pill-badge" style={{ marginBottom: '8px' }}>
          <span className="dot" />
          <span>CURRICULUM PREREQUISITE GRAPH</span>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          Curriculum Concepts & Prerequisite Tree
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
          {primaryCourse?.code}: {primaryCourse?.title} &bull; Instructor: {primaryCourse?.instructor}
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="saas-card" style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-pill-container" style={{ maxWidth: '360px' }}>
            <Search size={15} color="var(--text-light)" />
            <input
              type="text"
              className="search-pill-input"
              placeholder="Search concepts or learning objectives..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={14} color="var(--text-muted)" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
                fontSize: '12.5px',
                outline: 'none',
              }}
            >
              <option value="all">All Statuses</option>
              <option value="mastered">Mastered (&gt;75%)</option>
              <option value="developing">Developing (50-74%)</option>
              <option value="needs_practice">Needs Practice (&lt;50%)</option>
              <option value="locked">Locked (Prerequisites Unmet)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Modules & Concepts Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {primaryCourse?.modules?.map((module) => {
          const visibleConcepts = module.concepts.filter(filterConcept);
          if (visibleConcepts.length === 0 && searchQuery) return null;

          return (
            <div key={module.id} className="saas-card" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>{module.title}</h2>
                <span className="badge-clean blue">{visibleConcepts.length} Concepts</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                {visibleConcepts.map((concept) => {
                  const isLocked = concept.status === 'locked';

                  return (
                    <div
                      key={concept.id}
                      style={{
                        padding: '16px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: isLocked ? '#F8FAFC' : '#FFFFFF',
                        opacity: isLocked ? 0.75 : 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '12px',
                        transition: 'all 120ms ease',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span
                            className={`badge-clean ${
                              concept.status === 'mastered'
                                ? 'green'
                                : isLocked
                                ? 'slate'
                                : concept.status === 'needs_practice'
                                ? 'red'
                                : 'blue'
                            }`}
                          >
                            {isLocked ? (
                              <>
                                <Lock size={11} />
                                <span>Locked</span>
                              </>
                            ) : concept.status === 'mastered' ? (
                              <>
                                <CheckCircle2 size={11} />
                                <span>Mastered</span>
                              </>
                            ) : (
                              <>
                                <Clock size={11} />
                                <span>{concept.status === 'needs_practice' ? 'Needs Practice' : 'Developing'}</span>
                              </>
                            )}
                          </span>

                          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>
                            {Math.round(concept.masteryScore * 100)}% BKT Score
                          </span>
                        </div>

                        <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                          {concept.name}
                        </h3>

                        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                          {concept.description}
                        </p>

                        {isLocked && concept.lockReason && (
                          <div style={{ marginTop: '8px', padding: '6px 10px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', fontSize: '11.5px', color: '#991B1B' }}>
                            {concept.lockReason}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                        {isLocked ? (
                          <button type="button" className="btn-secondary" style={{ width: '100%', padding: '6px', fontSize: '12px' }} disabled>
                            Complete Prerequisite to Unlock
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn-primary"
                              style={{ flex: 1, padding: '6px 12px', fontSize: '12px' }}
                              onClick={() => setSelectedConcept(concept)}
                            >
                              <span>Learn Theory</span>
                              <BookOpen size={13} />
                            </button>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                              onClick={() => navigate('/content/quizzes')}
                            >
                              Quiz
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
          <div className="modal-dialog-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="studio-titlebar" style={{ padding: '12px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="window-traffic-dots">
                  <span className="traffic-dot red" />
                  <span className="traffic-dot yellow" />
                  <span className="traffic-dot green" />
                </div>
                <span className="studio-breadcrumb">
                  Pathwise Studio / <strong>Concept Theory Invariants</strong> / {selectedConcept.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedConcept(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-light)', display: 'flex' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <p style={{ fontSize: '13.5px', color: 'var(--text-main)', lineHeight: '1.6', marginBottom: '16px' }}>
                {selectedConcept.description}
              </p>

              {selectedConcept.learningObjectives?.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.04em', marginBottom: '8px' }}>
                    Learning Objectives:
                  </h4>
                  <ul style={{ paddingLeft: '18px', fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    {selectedConcept.learningObjectives.map((obj, i) => (
                      <li key={i} style={{ marginBottom: '4px' }}>{obj}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedConcept.theory && (
                <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12.5px', lineHeight: '1.6' }}>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0, color: 'var(--text-main)' }}>
                    {selectedConcept.theory}
                  </pre>
                </div>
              )}
            </div>

            <div style={{ padding: '14px 24px', background: '#F8FAFC', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setSelectedConcept(null);
                  navigate('/content/quizzes');
                }}
              >
                <HelpCircle size={14} />
                <span>Take Concept Quiz</span>
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setSelectedConcept(null);
                  navigate('/content/coding');
                }}
              >
                <Code2 size={14} />
                <span>Practice Coding Problem</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConceptsPage;
