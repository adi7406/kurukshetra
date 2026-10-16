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
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { learningService } from '../services/learningService';
import LoadingState from '../components/feedback/LoadingState';

export function DashboardPage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [course, setCourse] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [assessments, setAssessments] = useState([]);

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
    const filteredStudents = students.filter(
      (s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.className.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Student Cohort Mastery Dashboard</h1>
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>
              Monitoring all enrolled students with individualized concept mastery levels and diagnostic alerts.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <span className="ai-badge" style={{ padding: '6px 14px', fontSize: '12px' }}>
              <Sparkles size={14} />
              <span>Real-time BKT Mastery Model</span>
            </span>
          </div>
        </div>

        {/* Filter and Search Pill */}
        <div className="studdy-card" style={{ padding: '14px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div className="search-pill-container" style={{ maxWidth: '340px' }}>
              <Search size={16} color="var(--text-light)" />
              <input
                type="text"
                className="search-pill-input"
                placeholder="Search by student name, roll no, or class..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
              <span>Showing <strong>{filteredStudents.length}</strong> enrolled learners</span>
            </div>
          </div>
        </div>

        {/* All Students Table with Each of Their Mastery Levels */}
        <div className="studdy-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-light)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700' }}>Enrolled Students Roster</h2>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--surface-muted)', borderBottom: '1px solid var(--border-light)' }}>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)' }}>Student</th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)' }}>Class & Roll</th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)' }}>Overall Mastery</th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)' }}>Arrays</th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)' }}>Linked Lists</th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)' }}>Hash Tables</th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)' }}>Recursion</th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)' }}>DP</th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => {
                  const mastery = s.overallMastery || 40;
                  const cm = s.conceptMastery || {};

                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      {/* Name & Contact */}
                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="avatar-circle" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                            {s.avatarInitials || s.name[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', fontSize: '13.5px', color: 'var(--text-main)' }}>
                              {s.name}
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-light)' }}>
                              {s.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Class & Roll */}
                      <td style={{ padding: '16px 18px', fontSize: '13px' }}>
                        <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{s.rollNo}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{s.className}</div>
                      </td>

                      {/* Overall Mastery */}
                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '70px', height: '6px', background: 'var(--surface-muted)', borderRadius: '9999px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${mastery}%`,
                                height: '100%',
                                background: mastery >= 75 ? 'var(--success)' : mastery >= 50 ? 'var(--primary)' : 'var(--warning)',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: '800' }}>{mastery}%</span>
                        </div>
                      </td>

                      {/* Individual Concept Masteries */}
                      <td style={{ padding: '16px 18px', fontSize: '13px', fontWeight: '600' }}>
                        <span style={{ color: cm.c_arrays >= 75 ? 'var(--success)' : 'var(--text-main)' }}>
                          {cm.c_arrays || 0}%
                        </span>
                      </td>
                      <td style={{ padding: '16px 18px', fontSize: '13px', fontWeight: '600' }}>
                        <span style={{ color: cm.c_linkedlists >= 75 ? 'var(--success)' : 'var(--text-main)' }}>
                          {cm.c_linkedlists || 0}%
                        </span>
                      </td>
                      <td style={{ padding: '16px 18px', fontSize: '13px', fontWeight: '600' }}>
                        <span style={{ color: cm.c_hashtables < 50 ? 'var(--warning)' : 'var(--text-main)' }}>
                          {cm.c_hashtables || 0}%
                        </span>
                      </td>
                      <td style={{ padding: '16px 18px', fontSize: '13px', fontWeight: '600' }}>
                        <span style={{ color: cm.c_recursion >= 75 ? 'var(--success)' : 'var(--text-main)' }}>
                          {cm.c_recursion || 0}%
                        </span>
                      </td>
                      <td style={{ padding: '16px 18px', fontSize: '13px', fontWeight: '600' }}>
                        <span style={{ color: cm.c_dp < 50 ? 'var(--danger)' : 'var(--text-main)' }}>
                          {cm.c_dp || 0}%
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '16px 18px' }}>
                        <span
                          className={`role-badge ${
                            s.status?.includes('Excelling')
                              ? 'student'
                              : s.status?.includes('Needs Support')
                              ? 'teacher'
                              : 'student'
                          }`}
                          style={{
                            background: s.status?.includes('Needs Support') ? 'var(--danger-subtle)' : undefined,
                            color: s.status?.includes('Needs Support') ? 'var(--danger)' : undefined,
                          }}
                        >
                          {s.status || 'On Track'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STUDENT DASHBOARD
  // -------------------------------------------------------------
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Enrolled Course Learning Dashboard</h1>
        <p style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>
          Detailed breakdown for <strong>{course?.code}</strong>: {course?.title} &bull; Instructor: {course?.instructor}
        </p>
      </div>

      {/* Progress Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <div className="studdy-card">
          <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)' }}>
            Course Completion
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
            <span style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-main)' }}>
              {course?.currentStudentProgress}%
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>of syllabus concepts covered</span>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'var(--surface-muted)', borderRadius: '9999px', marginTop: '12px', overflow: 'hidden' }}>
            <div style={{ width: `${course?.currentStudentProgress}%`, height: '100%', background: 'var(--primary)' }} />
          </div>
        </div>

        <div className="studdy-card">
          <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)' }}>
            Quizzes on Concepts
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
            <span style={{ fontSize: '32px', fontWeight: '800', color: 'var(--primary)' }}>
              {quizzes.filter((q) => q.status === 'completed').length} / {quizzes.length}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>completed diagnostics</span>
          </div>
          <button
            type="button"
            className="btn-studdy btn-studdy-secondary"
            style={{ marginTop: '12px', width: '100%', padding: '6px 12px', fontSize: '12.5px' }}
            onClick={() => navigate('/content/quizzes')}
          >
            Open Quizzes &rarr;
          </button>
        </div>

        <div className="studdy-card">
          <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)' }}>
            Coding Assessments
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
            <span style={{ fontSize: '32px', fontWeight: '800', color: 'var(--success)' }}>
              {assessments.filter((a) => a.status === 'completed').length} / {assessments.length}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>verified solutions</span>
          </div>
          <button
            type="button"
            className="btn-studdy btn-studdy-secondary"
            style={{ marginTop: '12px', width: '100%', padding: '6px 12px', fontSize: '12.5px' }}
            onClick={() => navigate('/content/coding')}
          >
            Open Coding IDE &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
