import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Clock,
  BookOpen,
  HelpCircle,
  Code2,
  CheckCircle2,
  Calendar,
  Layers,
  UploadCloud,
  Users,
  Award,
  ChevronRight,
  Zap,
  Check,
  FileText,
  Shield,
  Radio,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { learningService } from '../services/learningService';
import { INITIAL_HOMEWORK_PROGRESS } from '../services/mockData';
import LoadingState from '../components/feedback/LoadingState';

export function HomePage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [tasks, setTasks] = useState(INITIAL_HOMEWORK_PROGRESS);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await learningService.getCourses();
        setCourses(data);
      } catch (err) {
        console.error('Failed to load home data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return <LoadingState message="Loading workspace..." />;
  }

  const primaryCourse = courses[0];
  const nextAction = primaryCourse?.nextRecommendedAction;
  const firstName = user?.name ? user.name.split(' ')[0] : 'Learner';

  // =============================================================
  // TEACHER HOME VIEW
  // =============================================================
  if (role === 'teacher') {
    return (
      <div style={{ padding: '0 24px 32px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Clean Hero Section */}
        <div className="hero-section-clean">
          <div className="hero-pill-badge">
            <span className="dot" />
            <span>Curriculum Engineering, Made Systematic</span>
          </div>

          <h1 className="hero-headline-clean">
            Automated curriculum.<br />
            <span className="highlight">Evidence-based instruction.</span>
          </h1>

          <p className="hero-subtitle-clean">
            Upload course syllabi in PDF or DOCX format. Experience automated prerequisite DAG extraction, diagnostic quiz generation, and isolated sandbox coding assessments.
          </p>

          <div className="hero-actions-row">
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate('/teacher/content-upload')}
              style={{ padding: '10px 20px', fontSize: '14px' }}
            >
              <span>Upload Syllabus & Extract</span>
              <ArrowRight size={15} />
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/dashboard')}
              style={{ padding: '10px 20px', fontSize: '14px' }}
            >
              <span>View Student Roster</span>
            </button>
          </div>

          <div className="hero-specs-row">
            <span><span className="check">✓</span> LLM In-Memory Processing</span>
            <span>&bull;</span>
            <span><span className="check">✓</span> Acyclic DAG Verification</span>
            <span>&bull;</span>
            <span><span className="check">✓</span> Zero Hallucination Grounding</span>
          </div>
        </div>

        {/* Studio Window Card (Traffic Light Mac-style Window Bar) */}
        <div className="studio-window-card">
          <div className="studio-titlebar">
            <div className="window-traffic-dots">
              <span className="traffic-dot red" />
              <span className="traffic-dot yellow" />
              <span className="traffic-dot green" />
            </div>

            <div className="studio-breadcrumb">
              <strong>Pathwise Studio</strong> / Curriculum & Cohort Analysis Workspace
            </div>

            <div className="studio-status-pill">
              <span className="status-dot" />
              <span>Ready &bull; Ingestion & AI Pipeline Active</span>
            </div>
          </div>

          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Cohort Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div className="saas-card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-muted)' }}>Active Cohort Size</span>
                  <Users size={16} color="var(--primary)" />
                </div>
                <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                  38
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>
                  Enrolled in CS201 Data Structures
                </div>
              </div>

              <div className="saas-card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-muted)' }}>Average Mastery Level</span>
                  <Award size={16} color="var(--success)" />
                </div>
                <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--success)', letterSpacing: '-0.02em' }}>
                  74%
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>
                  High comprehension in Arrays & Recursion
                </div>
              </div>

              <div className="saas-card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-muted)' }}>Curriculum Pipeline Items</span>
                  <Layers size={16} color="var(--warning)" />
                </div>
                <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                  3 Items
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>
                  Synthesized concepts & quizzes pending publish
                </div>
              </div>
            </div>

            {/* Quick Action Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div
                className="saas-card"
                onClick={() => navigate('/teacher/content-upload')}
                style={{ cursor: 'pointer', transition: 'border-color 150ms ease' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                    <UploadCloud size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: '700' }}>AI Syllabus Extractor</h3>
                    <p style={{ fontSize: '12.5px' }}>Ingest syllabus document to auto-generate Concepts, Quizzes, and Code Tasks</p>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Open Ingestion Studio &rarr;
                  </span>
                </div>
              </div>

              <div
                className="saas-card"
                onClick={() => navigate('/dashboard')}
                style={{ cursor: 'pointer', transition: 'border-color 150ms ease' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--success-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
                    <Users size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: '700' }}>Student Mastery Roster</h3>
                    <p style={{ fontSize: '12.5px' }}>Inspect all 38 students with individual concept mastery percentages</p>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Open Student Matrix &rarr;
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =============================================================
  // STUDENT HOME VIEW (Matching Samjho AI Clean Style)
  // =============================================================
  return (
    <div style={{ padding: '0 24px 32px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Clean Hero Section */}
      <div className="hero-section-clean">
        <div className="hero-pill-badge">
          <span className="dot" />
          <span>Adaptive Learning, Made Systematic</span>
        </div>

        <h1 className="hero-headline-clean">
          Complex algorithms.<br />
          <span className="highlight">Clear understanding.</span>
        </h1>

        <p className="hero-subtitle-clean">
          Study syllabus-aligned data structures, solve isolated sandbox coding problems, verify conceptual reasoning via AI viva, and track Bayesian Knowledge Tracing progress.
        </p>

        <div className="hero-actions-row">
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate('/content/concepts')}
            style={{ padding: '10px 20px', fontSize: '14px' }}
          >
            <span>Continue Learning</span>
            <ArrowRight size={15} />
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/dashboard')}
            style={{ padding: '10px 20px', fontSize: '14px' }}
          >
            <span>View Syllabus Graph</span>
          </button>
        </div>

        <div className="hero-specs-row">
          <span><span className="check">✓</span> Bayesian Knowledge Tracing</span>
          <span>&bull;</span>
          <span><span className="check">✓</span> Judge0 Sandboxed Execution</span>
          <span>&bull;</span>
          <span><span className="check">✓</span> Zero Hallucination Grounding</span>
        </div>
      </div>

      {/* Studio Window Card (Matching Reference Image) */}
      <div className="studio-window-card">
        <div className="studio-titlebar">
          <div className="window-traffic-dots">
            <span className="traffic-dot red" />
            <span className="traffic-dot yellow" />
            <span className="traffic-dot green" />
          </div>

          <div className="studio-breadcrumb">
            <strong>Pathwise Studio</strong> / Student Learning & Assessment Workspace
          </div>

          <div className="studio-status-pill">
            <span className="status-dot" />
            <span>Ready &bull; CS201 Data Structures Active</span>
          </div>
        </div>

        <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '24px' }}>
          {/* Main Left Studio Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 3 Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
              <div className="saas-card" style={{ padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Attendance Rate
                </div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)' }}>
                  19 / 20
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--success)', marginTop: '4px', fontWeight: '600' }}>
                  95% Active Sessions
                </div>
              </div>

              <div className="saas-card" style={{ padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Diagnostic Quizzes
                </div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)' }}>
                  53 / 56
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Concept checks passed
                </div>
              </div>

              <div className="saas-card" style={{ padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  BKT Estimated Mastery
                </div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary)' }}>
                  78%
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Overall readiness
                </div>
              </div>
            </div>

            {/* Next Recommended Adaptive Milestone */}
            {nextAction && (
              <div
                style={{
                  padding: '18px 20px',
                  borderRadius: '10px',
                  background: 'var(--primary-subtle)',
                  border: '1px solid var(--primary-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.04em' }}>
                    Recommended Next Action
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', marginTop: '2px' }}>
                    {nextAction.activityTitle}
                  </h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {nextAction.reason}
                  </p>
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => navigate('/content/quizzes')}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  <span>Start Activity</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}

            {/* Timetable Schedule */}
            <div className="saas-card" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={16} color="var(--primary)" />
                  <h3 style={{ fontSize: '14px', fontWeight: '700' }}>Scheduled Lectures & Diagnostic Sessions</h3>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                  Fall Semester 2026
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--surface-muted)', borderRadius: '8px', fontSize: '13px' }}>
                  <div>
                    <span style={{ fontWeight: '600' }}>CS201 Lecture: Self-Balancing AVL Rotations</span>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-light)', marginTop: '2px' }}>Hall 302 &bull; Dr. Priya Nair</div>
                  </div>
                  <span className="badge-clean blue">Today &bull; 11:30 AM</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--surface-muted)', borderRadius: '8px', fontSize: '13px' }}>
                  <div>
                    <span style={{ fontWeight: '600' }}>CS201 Lab: LRU Cache Isolated Sandbox Test</span>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-light)', marginTop: '2px' }}>Computing Lab 4 &bull; Judge0 Sandbox</div>
                  </div>
                  <span className="badge-clean green">Tomorrow &bull; 02:00 PM</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Homework & Task Progress Column */}
          <div className="saas-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700' }}>Task & Diagnostic Queue</h3>
              <span style={{ fontSize: '11.5px', color: 'var(--text-light)' }}>{tasks.length} Total</span>
            </div>

            {/* To Do */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: '6px' }}>
                Pending Action
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {tasks.filter((t) => t.status === 'todo').map((task) => (
                  <div
                    key={task.id}
                    onClick={() => {
                      if (task.category === 'quiz') navigate('/content/quizzes');
                      else navigate('/content/coding');
                    }}
                    style={{
                      padding: '8px 10px',
                      background: 'var(--surface-muted)',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      fontSize: '12.5px',
                    }}
                  >
                    <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{task.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <Clock size={11} />
                      <span>Due {task.deadline}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Completed */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: '6px' }}>
                Completed
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {tasks.filter((t) => t.status === 'completed').map((task) => (
                  <div
                    key={task.id}
                    style={{
                      padding: '8px 10px',
                      background: 'var(--surface-subtle)',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      fontSize: '12px',
                      opacity: 0.8,
                    }}
                  >
                    <div style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>
                      {task.title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <Check size={11} />
                      <span>Verified & Evaluated</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
