import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Code2,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Phone,
  Mail,
  GraduationCap,
  X,
  Award,
  Clock,
  Layers,
  ChevronRight,
  MessageSquare,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { learningService } from '../services/learningService';
import LoadingState from '../components/feedback/LoadingState';
import MasteryBadge from '../components/common/MasteryBadge';
import { normalizeMastery, getMasteryLevel } from '../utils/mastery';

export function DashboardPage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'mastered' | 'developing' | 'at_risk'
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
          setStudents(studentList);
        } else {
          const courses = await learningService.getCourses();
          setCourse(courses[0]);
          const qList = await learningService.getQuizzes();
          setQuizzes(qList);
          const aList = await learningService.getAssessments();
          setAssessments(aList);
          const p = await learningService.getProgress();
          setProgressData(p);
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
  // TEACHER DASHBOARD:
  // "Dashboard where it can see all students progress with each of their mastery level"
  // -------------------------------------------------------------
  if (role === 'teacher') {
    const filteredStudents = students.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.className.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      const mastery = normalizeMastery(s.overallMastery || 40);
      if (activeTab === 'mastered') return mastery >= 70;
      if (activeTab === 'developing') return mastery >= 40 && mastery < 70;
      if (activeTab === 'at_risk') return mastery < 40;
      return true;
    });

    const masteredCount = students.filter((s) => normalizeMastery(s.overallMastery || 0) >= 70).length;
    const developingCount = students.filter((s) => {
      const m = normalizeMastery(s.overallMastery || 0);
      return m >= 40 && m < 70;
    }).length;
    const atRiskCount = students.filter((s) => normalizeMastery(s.overallMastery || 0) < 40).length;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge-clean blue" style={{ fontSize: '10.5px' }}>
                Cohort Analytics
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                Enrolled students & mastery distribution
              </span>
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Student Cohort Mastery Dashboard
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Monitoring enrolled learners with mastery levels and prerequisite diagnostics.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <span className="badge-clean green" style={{ padding: '6px 12px', fontSize: '12px' }}>
              <span className="status-dot" />
              <span>Cohort Active ({students.length} Learners)</span>
            </span>
          </div>
        </div>

        {/* Filter and Search Pill */}
        <div className="saas-card" style={{ padding: '14px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div className="search-pill-container" style={{ maxWidth: '340px' }}>
              <Search size={15} color="var(--text-light)" />
              <input
                type="text"
                className="search-pill-input"
                placeholder="Search by student name, roll no, or class..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filter Segmented Controls */}
            <div style={{ display: 'flex', gap: '4px', background: 'var(--surface-muted)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  background: activeTab === 'all' ? 'var(--primary)' : 'transparent',
                  color: activeTab === 'all' ? '#FFF' : 'var(--text-muted)',
                  transition: 'all 120ms ease',
                }}
              >
                All Students ({students.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('mastered')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  background: activeTab === 'mastered' ? 'var(--success)' : 'transparent',
                  color: activeTab === 'mastered' ? '#FFF' : 'var(--text-muted)',
                  transition: 'all 120ms ease',
                }}
              >
                Mastered ({masteredCount})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('developing')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  background: activeTab === 'developing' ? 'var(--primary)' : 'transparent',
                  color: activeTab === 'developing' ? '#FFF' : 'var(--text-muted)',
                  transition: 'all 120ms ease',
                }}
              >
                Developing ({developingCount})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('at_risk')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  background: activeTab === 'at_risk' ? 'var(--danger)' : 'transparent',
                  color: activeTab === 'at_risk' ? '#FFF' : 'var(--text-muted)',
                  transition: 'all 120ms ease',
                }}
              >
                At Risk ({atRiskCount})
              </button>
            </div>
          </div>
        </div>

        {/* All Students Table with Each of Their Mastery Levels */}
        <div className="saas-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 0 }}>
          <div style={{ padding: '12px 18px', background: 'var(--surface-muted)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
              Enrolled Student Cohort Roster ({filteredStudents.length})
            </span>
            <span style={{ fontSize: '11.5px', color: 'var(--text-light)', fontWeight: '500' }}>
              Click any row for diagnostic breakdown
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--surface-muted)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.04em' }}>Student</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.04em' }}>Class & Roll</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.04em' }}>Overall Mastery</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.04em' }}>Arrays</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.04em' }}>Linked Lists</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.04em' }}>Hash Tables</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.04em' }}>Recursion</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.04em' }}>DP</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.04em' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.04em', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => {
                  const mastery = s.overallMastery || 40;
                  const cm = s.conceptMastery || {};

                  return (
                    <tr
                      key={s.id}
                      style={{ borderBottom: '1px solid var(--border-light)', cursor: 'pointer', transition: 'background 120ms ease' }}
                      onClick={() => setSelectedStudentForModal(s)}
                      className="hover-row"
                    >
                      {/* Name & Contact */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="avatar-circle" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                            {s.avatarInitials || s.name[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-main)' }}>
                              {s.name}
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-light)' }}>
                              {s.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Class & Roll */}
                      <td style={{ padding: '14px 16px', fontSize: '12.5px' }}>
                        <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{s.rollNo}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.className}</div>
                      </td>

                      {/* Overall Mastery Progress Bar & Badge */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <MasteryBadge score={mastery} size="sm" />
                          <span style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--text-main)' }}>
                            {normalizeMastery(mastery)}%
                          </span>
                        </div>
                      </td>

                      {/* Individual Concept Masteries */}
                      <td style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: '600' }}>
                        <span style={{ color: normalizeMastery(cm.c_arrays) >= 70 ? '#10B981' : normalizeMastery(cm.c_arrays) >= 40 ? '#F59E0B' : '#EF4444' }}>
                          {normalizeMastery(cm.c_arrays || 0)}%
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: '600' }}>
                        <span style={{ color: normalizeMastery(cm.c_linkedlists) >= 70 ? '#10B981' : normalizeMastery(cm.c_linkedlists) >= 40 ? '#F59E0B' : '#EF4444' }}>
                          {normalizeMastery(cm.c_linkedlists || 0)}%
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: '600' }}>
                        <span style={{ color: normalizeMastery(cm.c_hashtables) >= 70 ? '#10B981' : normalizeMastery(cm.c_hashtables) >= 40 ? '#F59E0B' : '#EF4444' }}>
                          {normalizeMastery(cm.c_hashtables || 0)}%
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: '600' }}>
                        <span style={{ color: normalizeMastery(cm.c_recursion) >= 70 ? '#10B981' : normalizeMastery(cm.c_recursion) >= 40 ? '#F59E0B' : '#EF4444' }}>
                          {normalizeMastery(cm.c_recursion || 0)}%
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '12.5px', fontWeight: '600' }}>
                        <span style={{ color: normalizeMastery(cm.c_dp) >= 70 ? '#10B981' : normalizeMastery(cm.c_dp) >= 40 ? '#F59E0B' : '#EF4444' }}>
                          {normalizeMastery(cm.c_dp || 0)}%
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          className={`badge-clean ${
                            s.status?.includes('Excelling')
                              ? 'green'
                              : s.status?.includes('Needs Support')
                              ? 'red'
                              : 'blue'
                          }`}
                        >
                          {s.status || 'On Track'}
                        </span>
                      </td>

                      {/* View Diagnostic CTA */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '11.5px', borderRadius: '6px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStudentForModal(s);
                          }}
                        >
                          Diagnostic
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Individual Student Diagnostic Modal */}
        {selectedStudentForModal && (
          <div className="modal-overlay" onClick={() => setSelectedStudentForModal(null)}>
            <div className="modal-dialog-card animate-fade-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
              <div style={{ padding: '12px 18px', background: 'var(--surface-muted)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
                  Student Diagnostic Report &bull; {selectedStudentForModal.name} ({selectedStudentForModal.rollNo})
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedStudentForModal(null)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-light)', display: 'flex' }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Student Header Summary */}
              <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="avatar-circle" style={{ width: '38px', height: '38px', fontSize: '14px', borderRadius: '8px' }}>
                    {selectedStudentForModal.avatarInitials || selectedStudentForModal.name[0]}
                  </div>
                  <div>
                    <h2 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-main)' }}>{selectedStudentForModal.name}</h2>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>
                      Roll No: {selectedStudentForModal.rollNo} &bull; {selectedStudentForModal.className} &bull; {selectedStudentForModal.email}
                    </div>
                  </div>
                </div>

                <span className={`badge-clean ${(selectedStudentForModal.overallMastery || 40) >= 70 ? 'green' : (selectedStudentForModal.overallMastery || 40) >= 40 ? 'blue' : 'amber'}`}>
                  {(selectedStudentForModal.overallMastery || 40) >= 70 ? 'Solid' : (selectedStudentForModal.overallMastery || 40) >= 40 ? 'Developing' : 'Weak'}
                </span>
              </div>

              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: '60vh' }}>
                {/* Academic Quick Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <div style={{ background: 'var(--surface-muted)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-light)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Overall BKT Mastery</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--primary)', marginTop: '2px' }}>
                      {selectedStudentForModal.overallMastery || 40}%
                    </div>
                  </div>
                  <div style={{ background: 'var(--surface-muted)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-light)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Attendance</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--success)', marginTop: '2px' }}>
                      {selectedStudentForModal.attendance || '9/10'}
                    </div>
                  </div>
                  <div style={{ background: 'var(--surface-muted)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-light)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Submissions</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>
                      {selectedStudentForModal.homeworkCompleted || '8/10'}
                    </div>
                  </div>
                </div>

                {/* Concept Breakdown Progress Bars */}
                <div>
                  <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '10px' }}>
                    Bayesian Knowledge Tracing (BKT) Posterior Probabilities
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {Object.entries(selectedStudentForModal.conceptMastery || {}).map(([cKey, score]) => (
                      <div key={cKey}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                          <span style={{ fontWeight: '600', textTransform: 'capitalize', color: 'var(--text-main)' }}>
                            {cKey.replace('c_', '').replace('_', ' ')}
                          </span>
                          <span style={{ fontWeight: '700', color: score >= 70 ? 'var(--success)' : score >= 40 ? 'var(--primary)' : 'var(--danger)' }}>
                            {score}% {score >= 70 ? '· Solid' : score >= 40 ? '· Developing' : '· Weak'}
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '5px', background: 'var(--surface-muted)', borderRadius: '9999px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${score}%`,
                              height: '100%',
                              background: score >= 70 ? 'var(--success)' : score >= 40 ? 'var(--primary)' : 'var(--danger)',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Adaptive Intervention Recommendation */}
                <div style={{ background: 'var(--primary-subtle)', padding: '14px 16px', borderRadius: '8px', border: '1px solid var(--primary-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <Sparkles size={13} />
                    <span>Algorithmic Remediation Plan</span>
                  </div>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-main)', marginTop: '6px', lineHeight: '1.5' }}>
                    {selectedStudentForModal.overallMastery < 40
                      ? 'Student struggles with foundational prerequisite concepts. Recommend assigning targeted diagnostic quizzes before advancing to dependent graph structures.'
                      : 'Student exhibits solid retention and prerequisite readiness. Ready for advanced self-balancing AVL trees and graph traversal assessments.'}
                  </p>
                </div>
              </div>

              <div style={{ padding: '14px 24px', background: 'var(--surface-muted)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedStudentForModal(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    alert(`Targeted practice set assigned to ${selectedStudentForModal.name}!`);
                    setSelectedStudentForModal(null);
                  }}
                >
                  <CheckCircle2 size={14} />
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
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span className="badge-clean blue" style={{ fontSize: '10.5px' }}>
            Course Overview
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
            Curriculum roadmap & learning milestones
          </span>
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          Enrolled Course Learning Dashboard
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
          Detailed curriculum roadmap for <strong>{course?.code}</strong>: {course?.title} &bull; Instructor: {course?.instructor}
        </p>
      </div>

      {/* Progress Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <div className="saas-card">
          <span style={{ fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.04em' }}>
            Course Completion
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
            <span style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              {course?.currentStudentProgress}%
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>of syllabus concepts covered</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'var(--surface-muted)', borderRadius: '9999px', marginTop: '12px', overflow: 'hidden' }}>
            <div style={{ width: `${course?.currentStudentProgress}%`, height: '100%', background: 'var(--primary)' }} />
          </div>
        </div>

        <div className="saas-card">
          <span style={{ fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.04em' }}>
            Quizzes on Concepts
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
            <span style={{ fontSize: '32px', fontWeight: '800', color: 'var(--primary)', letterSpacing: '-0.02em' }}>
              {quizzes.filter((q) => q.status === 'completed').length} / {quizzes.length}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>completed diagnostics</span>
          </div>
          <button
            type="button"
            className="btn-secondary"
            style={{ marginTop: '12px', width: '100%', padding: '6px 12px', fontSize: '12.5px' }}
            onClick={() => navigate('/content/quizzes')}
          >
            <span>Open Quizzes</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="saas-card">
          <span style={{ fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.04em' }}>
            Coding Assessments
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
            <span style={{ fontSize: '32px', fontWeight: '800', color: 'var(--success)', letterSpacing: '-0.02em' }}>
              {assessments.filter((a) => a.status === 'completed').length} / {assessments.length}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>verified solutions</span>
          </div>
          <button
            type="button"
            className="btn-secondary"
            style={{ marginTop: '12px', width: '100%', padding: '6px 12px', fontSize: '12.5px' }}
            onClick={() => navigate('/content/coding')}
          >
            <span>Open Coding IDE</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* Concept Breakdown Table for Student */}
      <div className="saas-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 0 }}>
        <div style={{ padding: '12px 18px', background: 'var(--surface-muted)', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
            Concept Mastery Breakdown
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface-muted)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.04em' }}>Concept Name</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.04em' }}>Module</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.04em' }}>Mastery Level</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.04em' }}>Status</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.04em', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {progressData?.conceptBreakdown?.map((item) => (
                <tr key={item.conceptId} style={{ borderBottom: '1px solid var(--border)' }} className="hover-row">
                  <td style={{ padding: '13px 16px', fontWeight: '600', fontSize: '13px', color: 'var(--text-main)' }}>
                    {item.name}
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    Module 1: Linear & Key-Value
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '70px', height: '5px', background: 'var(--surface-muted)', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${item.mastery}%`,
                            height: '100%',
                            background: item.mastery >= 75 ? 'var(--success)' : item.mastery >= 50 ? 'var(--primary)' : 'var(--danger)',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '12.5px', fontWeight: '700' }}>{item.mastery}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <span
                      className={`badge-clean ${item.mastery >= 75 ? 'green' : 'blue'}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td style={{ padding: '13px 16px', textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '11.5px', borderRadius: '6px' }}
                      onClick={() => navigate('/content/concepts')}
                    >
                      Study
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
