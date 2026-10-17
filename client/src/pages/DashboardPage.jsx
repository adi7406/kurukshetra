import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  CheckCircle2,
  HelpCircle,
  Code2,
  ArrowRight,
  Sparkles,
  X,
  ChevronRight,
  Layers,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { learningService } from '../services/learningService';
import LoadingState from '../components/feedback/LoadingState';
import EmptyState from '../components/feedback/EmptyState';
import PillTabs from '../components/common/PillTabs';
import MasteryChip from '../components/common/MasteryChip';
import Chip from '../components/common/Chip';
import ProgressRing from '../components/common/ProgressRing';
import { normalizeMastery } from '../utils/mastery';

export function DashboardPage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedStudentForModal, setSelectedStudentForModal] = useState(null);

  const [course, setCourse] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [progressData, setProgressData] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        if (role === 'teacher') {
          const studentList = await authService.getAllStudents();
          setStudents(studentList || []);
        } else {
          const courses = await learningService.getCourses();
          setCourse(courses[0] || null);
          const qList = await learningService.getQuizzes();
          setQuizzes(qList || []);
          const aList = await learningService.getAssessments();
          setAssessments(aList || []);
          const p = await learningService.getProgress();
          setProgressData(p || null);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [role]);

  if (loading) {
    return <LoadingState message="Loading dashboard insights..." />;
  }

  // -------------------------------------------------------------
  // TEACHER DASHBOARD
  // -------------------------------------------------------------
  if (role === 'teacher') {
    const masteredCount = students.filter((s) => normalizeMastery(s.overallMastery || 0) >= 70).length;
    const developingCount = students.filter((s) => {
      const m = normalizeMastery(s.overallMastery || 0);
      return m >= 40 && m < 70;
    }).length;
    const atRiskCount = students.filter((s) => normalizeMastery(s.overallMastery || 0) < 40).length;

    const filteredStudents = students.filter((s) => {
      const matchesSearch =
        (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.rollNo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.className || '').toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      const mastery = normalizeMastery(s.overallMastery || 0);
      if (activeTab === 'mastered') return mastery >= 70;
      if (activeTab === 'developing') return mastery >= 40 && mastery < 70;
      if (activeTab === 'at_risk') return mastery < 40;
      return true;
    });

    const filterTabs = [
      { id: 'all', label: 'All Students', count: students.length },
      { id: 'mastered', label: 'Mastered', count: masteredCount },
      { id: 'developing', label: 'Developing', count: developingCount },
      { id: 'at_risk', label: 'At Risk', count: atRiskCount },
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em' }}>
              Cohort Analytics
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '-0.01em', margin: '4px 0 0 0' }}>
              Student Cohort Mastery Dashboard
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
              Monitoring enrolled learners with mastery levels and prerequisite diagnostics.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Chip variant={students.length > 0 ? 'success' : 'neutral'} size="sm">
              Cohort Active ({students.length} Learners)
            </Chip>
          </div>
        </div>

        {/* Search & Pill Filter Bar */}
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: '20px',
            border: '1px solid var(--border-hairline)',
            boxShadow: 'var(--shadow-card)',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div className="search-pill-container" style={{ maxWidth: '340px' }}>
            <Search size={15} strokeWidth={1.5} color="var(--text-secondary)" />
            <input
              type="text"
              className="search-pill-input"
              placeholder="Search by student name, roll no, or class..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <PillTabs tabs={filterTabs} activeTab={activeTab} onChange={(id) => setActiveTab(id)} />
        </div>

        {/* Cohort Table */}
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: '20px',
            border: '1px solid var(--border-hairline)',
            boxShadow: 'var(--shadow-card)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '14px 20px', background: 'var(--surface-muted)', borderBottom: '1px solid var(--border-hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-main)' }}>
              Enrolled Student Cohort Roster ({filteredStudents.length})
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Click any row for diagnostic breakdown
            </span>
          </div>

          {filteredStudents.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <EmptyState
                icon={Users}
                title={searchQuery ? 'No Matching Students' : 'No Students Enrolled Yet'}
                description={searchQuery ? 'No students match your filter criteria.' : 'Live student analytics and prerequisite knowledge tracking will appear as learners enroll and submit attempts.'}
                actionLabel="Open Syllabus Studio"
                onAction={() => navigate('/teacher/content-upload')}
              />
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-muted)', borderBottom: '1px solid var(--border-hairline)' }}>
                    <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>Student</th>
                    <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>Class & Roll</th>
                    <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>Overall Mastery</th>
                    <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>Topic Competencies</th>
                    <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s) => {
                    const mastery = s.overallMastery || 0;
                    const cm = s.conceptMastery || {};
                    const cmEntries = Object.entries(cm);

                    return (
                      <tr
                        key={s.id}
                        style={{ borderBottom: '1px solid var(--border-hairline)', cursor: 'pointer', transition: 'background 120ms ease' }}
                        onClick={() => setSelectedStudentForModal(s)}
                        className="hover-row"
                      >
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'var(--coral-soft)',
                                color: 'var(--coral)',
                                fontSize: '12px',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {s.avatarInitials || (s.name ? s.name[0] : 'S')}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>
                                {s.name}
                              </div>
                              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                                {s.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px', fontSize: '12.5px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{s.rollNo || 'N/A'}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{s.className || 'General'}</div>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <MasteryChip score={mastery} size="sm" />
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          {cmEntries.length > 0 ? (
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {cmEntries.slice(0, 3).map(([k, score]) => (
                                <span key={k} style={{ fontSize: '11px', padding: '2px 7px', background: 'var(--surface-muted)', borderRadius: '6px', color: 'var(--text-secondary)', border: '1px solid var(--border-hairline)' }}>
                                  {k.replace('c_', '').replace(/_/g, ' ')}: {normalizeMastery(score)}%
                                </span>
                              ))}
                              {cmEntries.length > 3 && (
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                  +{cmEntries.length - 3} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>No assessments taken</span>
                          )}
                        </td>

                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn-ghost-pill btn-compact"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStudentForModal(s);
                            }}
                          >
                            <span>Diagnostic</span>
                            <ChevronRight size={13} strokeWidth={1.5} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Individual Student Diagnostic Modal */}
        {selectedStudentForModal && (
          <div className="modal-overlay" onClick={() => setSelectedStudentForModal(null)}>
            <div
              className="modal-dialog-card animate-fade-in"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '600px', borderRadius: '20px', border: '1px solid var(--border-hairline)' }}
            >
              <div style={{ padding: '14px 20px', background: 'var(--surface-muted)', borderBottom: '1px solid var(--border-hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-main)' }}>
                  Student Diagnostic &bull; {selectedStudentForModal.name}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedStudentForModal(null)}
                  className="icon-btn-circle"
                  style={{ width: '30px', height: '30px' }}
                >
                  <X size={15} strokeWidth={1.5} />
                </button>
              </div>

              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: '65vh' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                      {selectedStudentForModal.name}
                    </h2>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px', margin: 0 }}>
                      Roll No: {selectedStudentForModal.rollNo} &bull; {selectedStudentForModal.className}
                    </p>
                  </div>
                  <MasteryChip score={selectedStudentForModal.overallMastery || 40} size="md" />
                </div>

                {/* Performance Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <div style={{ background: 'var(--surface-muted)', padding: '10px 14px', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Mastery</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>{selectedStudentForModal.overallMastery || 40}%</div>
                  </div>
                  <div style={{ background: 'var(--surface-muted)', padding: '10px 14px', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Tasks Completed</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>{selectedStudentForModal.completedAssessmentsCount || 0}</div>
                  </div>
                  <div style={{ background: 'var(--surface-muted)', padding: '10px 14px', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Recent Score</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--coral)' }}>
                      {selectedStudentForModal.recentScore !== null && selectedStudentForModal.recentScore !== undefined ? `${selectedStudentForModal.recentScore}%` : 'Pending'}
                    </div>
                  </div>
                </div>

                {/* AI Adaptive Intervention */}
                <div style={{ background: 'var(--coral-soft)', padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--coral-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--coral)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <Sparkles size={13} strokeWidth={1.5} />
                    <span>Algorithmic Remediation Plan</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-main)', marginTop: '6px', lineHeight: '1.5', margin: '6px 0 0 0' }}>
                    {selectedStudentForModal.overallMastery < 40
                      ? 'Student struggles with foundational prerequisite concepts. Recommend assigning targeted diagnostic quizzes before advancing to dependent tree structures.'
                      : 'Student exhibits solid retention and prerequisite readiness. Ready for advanced self-balancing AVL trees and graph traversal assessments.'}
                  </p>
                </div>
              </div>

              <div style={{ padding: '14px 20px', background: 'var(--surface-muted)', borderTop: '1px solid var(--border-hairline)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-ghost-pill btn-compact" onClick={() => setSelectedStudentForModal(null)}>
                  Close
                </button>
                <button
                  type="button"
                  className="btn-coral-pill btn-compact"
                  onClick={() => {
                    alert(`Targeted practice set assigned to ${selectedStudentForModal.name}!`);
                    setSelectedStudentForModal(null);
                  }}
                >
                  <CheckCircle2 size={13} strokeWidth={1.5} />
                  <span>Assign Remedial Practice</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // STUDENT DASHBOARD
  // -------------------------------------------------------------
  const completedQuizzesCount = quizzes.filter((q) => q.status === 'completed').length;
  const completedAssessmentsCount = assessments.filter((a) => a.status === 'completed').length;
  const studentProgress = course?.currentStudentProgress || progressData?.overallEstimatedMastery || 0;

  if (!course && quizzes.length === 0 && assessments.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em' }}>
            Course Overview
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '-0.01em', margin: '4px 0 0 0' }}>
            Enrolled Course Learning Dashboard
          </h1>
        </div>
        <div style={{ background: 'var(--surface)', borderRadius: '20px', border: '1px solid var(--border-hairline)', boxShadow: 'var(--shadow-card)', padding: '48px 24px', textAlign: 'center' }}>
          <EmptyState
            icon={BookOpen}
            title="No Course Content Published Yet"
            description="Your instructor has not published the active syllabus yet. When content is published, your personalized roadmap, quiz diagnostics, and coding benchmarks will appear here."
            actionText="Explore Concept Map"
            onAction={() => navigate('/content/concepts')}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <div>
        <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em' }}>
          Course Overview
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '-0.01em', margin: '4px 0 0 0' }}>
          Enrolled Course Learning Dashboard
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
          Curriculum roadmap for <strong>{course?.code || 'Active Course'}</strong>: {course?.title || 'Data Structures & Algorithms'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <div style={{ background: 'var(--surface)', borderRadius: '20px', border: '1px solid var(--border-hairline)', boxShadow: 'var(--shadow-card)', padding: '22px' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
            Course Completion
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '10px 0' }}>
            <span style={{ fontSize: '30px', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
              {studentProgress}%
            </span>
            <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>of syllabus covered</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'var(--surface-muted)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
            <div style={{ width: `${studentProgress}%`, height: '100%', background: 'var(--coral)' }} />
          </div>
        </div>

        <div style={{ background: 'var(--surface)', borderRadius: '20px', border: '1px solid var(--border-hairline)', boxShadow: 'var(--shadow-card)', padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
              Concept Quizzes
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '10px 0' }}>
              <span style={{ fontSize: '30px', fontWeight: 600, color: 'var(--coral)', letterSpacing: '-0.01em' }}>
                {completedQuizzesCount} / {quizzes.length}
              </span>
              <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>completed</span>
            </div>
          </div>
          <button type="button" className="btn-ghost-pill btn-compact" onClick={() => navigate('/content/quizzes')}>
            <span>Practice Quizzes</span>
            <ArrowRight size={13} strokeWidth={1.5} />
          </button>
        </div>

        <div style={{ background: 'var(--surface)', borderRadius: '20px', border: '1px solid var(--border-hairline)', boxShadow: 'var(--shadow-card)', padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
              Coding Challenges
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '10px 0' }}>
              <span style={{ fontSize: '30px', fontWeight: 600, color: 'var(--mastery-solid)', letterSpacing: '-0.01em' }}>
                {completedAssessmentsCount} / {assessments.length}
              </span>
              <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>verified solutions</span>
            </div>
          </div>
          <button type="button" className="btn-ghost-pill btn-compact" onClick={() => navigate('/content/coding')}>
            <span>Coding Sandbox</span>
            <ArrowRight size={13} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
