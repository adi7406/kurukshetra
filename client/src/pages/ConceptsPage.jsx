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
        <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Curriculum Concepts & Prerequisite Tree</h1>
        <p style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>
          {primaryCourse?.code}: {primaryCourse?.title} &bull; Instructor: {primaryCourse?.instructor}
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="studdy-card" style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-pill-container" style={{ maxWidth: '360px' }}>
            <Search size={16} color="var(--text-light)" />
            <input
              type="text"
              className="search-pill-input"
              placeholder="Search concepts or learning objectives..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={15} color="var(--text-muted)" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--pill-radius)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
                fontSize: '13px',
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {primaryCourse?.modules?.map((module) => {
          const visibleConcepts = module.concepts.filter(filterConcept);
          if (visibleConcepts.length === 0 && searchQuery) return null;

          return (
            <div key={module.id} className="studdy-card" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '16.5px', fontWeight: '700' }}>{module.title}</h2>
                <span className="ai-badge">{visibleConcepts.length} Concepts</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                {visibleConcepts.map((concept) => {
                  const isLocked = concept.status === 'locked';

                  return (
                    <div
                      key={concept.id}
                      style={{
                        padding: '16px 18px',
                        borderRadius: '18px',
                        border: '1px solid var(--border-light)',
                        background: isLocked ? 'var(--surface-muted)' : 'var(--surface-subtle)',
                        opacity: isLocked ? 0.8 : 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '12px',
                        transition: 'all 150ms ease',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span
                            className={`role-badge ${
                              concept.status === 'mastered'
                                ? 'student'
                                : concept.status === 'needs_practice'
                                ? 'teacher'
                                : 'student'
                            }`}
                          >
                            {isLocked ? (
                              <>
                                <Lock size={12} />
                                <span>Locked</span>
                              </>
                            ) : concept.status === 'mastered' ? (
                              <>
                                <CheckCircle2 size={12} />
                                <span>Mastered</span>
                              </>
                            ) : (
                              <>
                                <Clock size={12} />
                                <span>{concept.status === 'needs_practice' ? 'Needs Practice' : 'Developing'}</span>
                              </>
                            )}
                          </span>

                          <span style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--text-main)' }}>
                            {Math.round(concept.masteryScore * 100)}% Mastery
                          </span>
                        </div>

                        <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>
                          {concept.name}
                        </h3>

                        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.45' }}>
                          {concept.description}
                        </p>

                        {isLocked && concept.lockReason && (
                          <div style={{ marginTop: '8px', padding: '6px 10px', background: '#FEE2E2', borderRadius: '10px', fontSize: '11.5px', color: '#991B1B' }}>
                            {concept.lockReason}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                        {isLocked ? (
                          <button type="button" className="btn-studdy btn-studdy-secondary" style={{ width: '100%', padding: '7px', fontSize: '12px' }} disabled>
                            Complete Prerequisite to Unlock
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn-studdy btn-studdy-primary"
                              style={{ flex: 1, padding: '7px 12px', fontSize: '12px' }}
                              onClick={() => setSelectedConcept(concept)}
                            >
                              <span>Learn Theory</span>
                              <BookOpen size={13} />
                            </button>
                            <button
                              type="button"
                              className="btn-studdy btn-studdy-secondary"
                              style={{ padding: '7px 12px', fontSize: '12px' }}
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
          <div className="modal-dialog-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={20} color="var(--primary)" />
                <h2 style={{ fontSize: '18px', fontWeight: '800' }}>{selectedConcept.name}</h2>
              </div>
              <button
                type="button"
                className="icon-btn-pill"
                style={{ width: '34px', height: '34px' }}
                onClick={() => setSelectedConcept(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <p style={{ fontSize: '14px', color: 'var(--text-main)', marginBottom: '16px' }}>
                {selectedConcept.description}
              </p>

              {selectedConcept.learningObjectives?.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '13.5px', fontWeight: '700', marginBottom: '8px' }}>
                    Learning Objectives:
                  </h4>
                  <ul style={{ paddingLeft: '18px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    {selectedConcept.learningObjectives.map((obj, i) => (
                      <li key={i} style={{ marginBottom: '4px' }}>{obj}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedConcept.theory && (
                <div style={{ padding: '16px', background: 'var(--surface-muted)', borderRadius: '16px', border: '1px solid var(--border-light)', fontSize: '13px', lineHeight: '1.6' }}>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
                    {selectedConcept.theory}
                  </pre>
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn-studdy btn-studdy-secondary"
                onClick={() => {
                  setSelectedConcept(null);
                  navigate('/content/quizzes');
                }}
              >
                <HelpCircle size={15} />
                <span>Take Concept Quiz</span>
              </button>
              <button
                type="button"
                className="btn-studdy btn-studdy-primary"
                onClick={() => {
                  setSelectedConcept(null);
                  navigate('/content/coding');
                }}
              >
                <Code2 size={15} />
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
