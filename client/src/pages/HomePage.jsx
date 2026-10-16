import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Clock,
  Sparkles,
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
    return <LoadingState message="Loading your workspace..." />;
  }

  const primaryCourse = courses[0];
  const nextAction = primaryCourse?.nextRecommendedAction;
  const firstName = user?.name ? user.name.split(' ')[0] : 'Learner';

  // -------------------------------------------------------------
  // TEACHER HOME VIEW
  // -------------------------------------------------------------
  if (role === 'teacher') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Studdy-Style Hero Banner for Instructor */}
        <div className="hero-studdy-card">
          <div className="hero-content">
            <h1 className="hero-title">Welcome back, {firstName}! 👨‍🏫</h1>
            <p className="hero-desc">
              Your students have completed <strong>74%</strong> of scheduled assessments this week.
              Ready to upload new curriculum or review AI-extracted concepts?
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-studdy"
                style={{ background: '#FFFFFF', color: 'var(--primary)' }}
                onClick={() => navigate('/teacher/content-upload')}
              >
                <UploadCloud size={16} />
                <span>Upload Syllabus & Run AI Extraction</span>
              </button>
              <button
                type="button"
                className="btn-studdy"
                style={{ background: 'rgba(255, 255, 255, 0.2)', color: '#FFFFFF' }}
                onClick={() => navigate('/dashboard')}
              >
                <Users size={16} />
                <span>View All Students Progress</span>
              </button>
            </div>
          </div>

          {/* Friendly Mascot SVG Badge */}
          <div className="hero-mascot-wrapper">
            <div
              style={{
                width: '110px',
                height: '110px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '56px',
              }}
            >
              🎓
            </div>
          </div>
        </div>

        {/* 3 Stat Cards (Studdy Aesthetic) */}
        <div className="stat-widgets-grid">
          <div className="stat-widget-card">
            <div className="stat-widget-header">
              <span className="stat-widget-title">Active Cohort Size</span>
              <div className="stat-circle-icon blue">
                <Users size={20} />
              </div>
            </div>
            <div className="stat-number-row">
              <span className="stat-huge-number">38</span>
              <span className="stat-unit-text">students enrolled</span>
            </div>
            <span className="stat-footer-text">
              CS201 Data Structures &bull; Batch 2026
            </span>
          </div>

          <div className="stat-widget-card">
            <div className="stat-widget-header">
              <span className="stat-widget-title">Average Mastery</span>
              <div className="stat-circle-icon green">
                <Award size={20} />
              </div>
            </div>
            <div className="stat-number-row">
              <span className="stat-huge-number">74%</span>
              <span className="stat-unit-text">cohort readiness</span>
            </div>
            <span className="stat-footer-text">
              High comprehension in Arrays & Recursion
            </span>
          </div>

          <div className="stat-widget-card">
            <div className="stat-widget-header">
              <span className="stat-widget-title">AI Content Status</span>
              <div className="stat-circle-icon amber">
                <Sparkles size={20} />
              </div>
            </div>
            <div className="stat-number-row">
              <span className="stat-huge-number">3</span>
              <span className="stat-unit-text">items in review</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="ai-badge">AI Powered ✨</span>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                onClick={() => navigate('/teacher/content-upload')}
              >
                Review Items &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* Quick Launchpad to Teacher Sections */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="studdy-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
              <div className="stat-circle-icon blue">
                <Users size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Student Mastery Dashboard</h3>
                <p style={{ fontSize: '13px' }}>See all student progress with each individual mastery level</p>
              </div>
            </div>
            <button type="button" className="btn-studdy btn-studdy-secondary" style={{ width: '100%', marginTop: '6px' }}>
              <span>Open Student Roster</span>
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="studdy-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/teacher/content-upload')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
              <div className="stat-circle-icon amber">
                <UploadCloud size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700' }}>AI Syllabus Extractor</h3>
                <p style={{ fontSize: '13px' }}>Upload syllabus to auto-generate Concepts, Quizzes & Code Tasks</p>
              </div>
            </div>
            <button type="button" className="btn-studdy btn-studdy-primary" style={{ width: '100%', marginTop: '6px' }}>
              <span>Launch Content Extractor</span>
              <Sparkles size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STUDENT HOME VIEW (Directly Matching Studdy Reference Image!)
  // -------------------------------------------------------------
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '20px' }}>
      {/* Left / Center Main Column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Studdy Hero Banner Card */}
        <div className="hero-studdy-card">
          <div className="hero-content">
            <h1 className="hero-title">Welcome back, {firstName}! 👋</h1>
            <p className="hero-desc">
              You've learned <strong>78%</strong> of your goal this week! Keep it up and improve your progress.
            </p>
            <div className="hero-progress-pill">
              <Sparkles size={14} />
              <span>Adaptive learning path actively personalized</span>
            </div>
          </div>

          {/* Cute Studdy Monster Mascot Graphic */}
          <div className="hero-mascot-wrapper">
            <svg width="120" height="120" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="25" y="30" width="90" height="90" rx="30" fill="#00D2FF" />
              <path d="M40 25L30 10M100 25L110 10" stroke="#FF7A00" strokeWidth="8" strokeLinecap="round" />
              <circle cx="52" cy="65" r="18" fill="white" />
              <circle cx="88" cy="65" r="18" fill="white" />
              <circle cx="54" cy="65" r="9" fill="#1E293B" />
              <circle cx="86" cy="65" r="9" fill="#1E293B" />
              <circle cx="57" cy="62" r="3" fill="white" />
              <circle cx="89" cy="62" r="3" fill="white" />
              <path d="M56 94C62 102 78 102 84 94" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
              <rect x="75" y="85" width="40" height="48" rx="8" fill="#FF4E78" />
              <path d="M85 96H105M85 106H100" stroke="white" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Three Stat Cards matching Reference Image */}
        <div className="stat-widgets-grid">
          {/* Card 1: Attendance */}
          <div className="stat-widget-card">
            <div className="stat-widget-header">
              <span className="stat-widget-title">Attendance</span>
              <div className="stat-circle-icon blue">
                <Clock size={18} />
              </div>
            </div>
            <div className="stat-number-row">
              <span className="stat-huge-number">19/20</span>
              <span className="stat-unit-text">days active</span>
            </div>
            <span className="stat-footer-text">
              Well done! You're attending all lessons. Keep going!
            </span>
          </div>

          {/* Card 2: Homework / Assessments */}
          <div className="stat-widget-card">
            <div className="stat-widget-header">
              <span className="stat-widget-title">Diagnostics</span>
              <div className="stat-circle-icon cyan">
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div className="stat-number-row">
              <span className="stat-huge-number">53/56</span>
              <span className="stat-unit-text">tasks completed</span>
            </div>
            <span className="stat-footer-text">
              Don't forget about your next diagnostic practice.
            </span>
          </div>

          {/* Card 3: Rating (AI Powered) */}
          <div className="stat-widget-card">
            <div className="stat-widget-header">
              <span className="stat-widget-title">Concept Rating</span>
              <span className="ai-badge">AI Powered ✨</span>
            </div>
            <div className="stat-number-row">
              <span className="stat-huge-number">89/100</span>
              <span className="stat-unit-text">mastery score</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="stat-footer-text">Overall readiness</span>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                onClick={() => navigate('/progress')}
              >
                Go to report &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* Timetable / Recommended Action Section */}
        <div className="studdy-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="var(--primary)" />
              <h2 style={{ fontSize: '16px', fontWeight: '700' }}>Active Learning Schedule & Timetable</h2>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: '600' }}>
              Oct 16, 2026
            </span>
          </div>

          {/* Date Picker Pills (Matching Image) */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto' }}>
            {['Mon 13', 'Tue 14', 'Wed 15', 'Thu 16', 'Fri 17', 'Sat 18', 'Sun 19'].map((day, i) => {
              const isToday = day.includes('Thu 16');
              return (
                <div
                  key={i}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '14px',
                    background: isToday ? 'var(--primary)' : 'var(--surface-muted)',
                    color: isToday ? '#FFFFFF' : 'var(--text-muted)',
                    fontWeight: '700',
                    fontSize: '12.5px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    boxShadow: isToday ? 'var(--primary-glow)' : 'none',
                  }}
                >
                  {day}
                </div>
              );
            })}
          </div>

          {/* Next Recommended Concept Action Banner */}
          {nextAction && (
            <div
              style={{
                padding: '16px 20px',
                borderRadius: '16px',
                background: 'var(--primary-subtle)',
                border: '1px solid #BFDBFE',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase' }}>
                  <Zap size={13} />
                  <span>Next Adaptive Milestone</span>
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: '700', marginTop: '2px', color: 'var(--text-main)' }}>
                  {nextAction.activityTitle}
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '3px' }}>
                  {nextAction.reason}
                </p>
              </div>

              <button
                type="button"
                className="btn-studdy btn-studdy-primary"
                onClick={() => navigate('/content/quizzes')}
              >
                <span>Start Now</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Homework & Assessment Progress (Matching Image!) */}
      <div className="homework-progress-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700' }}>Homework progress</h2>
          <span style={{ fontSize: '12.5px', color: 'var(--text-light)', fontWeight: '600', cursor: 'pointer' }}>
            All ▾
          </span>
        </div>

        {/* Section: To do */}
        <div>
          <div className="homework-section-title">To do</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tasks.filter((t) => t.status === 'todo').map((task) => (
              <div
                key={task.id}
                className="task-item"
                onClick={() => {
                  if (task.category === 'quiz') navigate('/content/quizzes');
                  else navigate('/content/coding');
                }}
              >
                <div className="task-checkbox-circle" />
                <div style={{ flex: 1 }}>
                  <div className="task-title">{task.title}</div>
                  <div className="task-meta">
                    <Clock size={11} />
                    <span>Deadline {task.deadline}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section: On review */}
        <div>
          <div className="homework-section-title">On review</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tasks.filter((t) => t.status === 'on_review').map((task) => (
              <div key={task.id} className="task-item">
                <div className="task-checkbox-circle" style={{ borderColor: 'var(--warning)' }} />
                <div style={{ flex: 1 }}>
                  <div className="task-title">{task.title}</div>
                  <div className="task-meta">
                    <Clock size={11} />
                    <span>Submitted &bull; Awaiting Feedback</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section: Completed */}
        <div>
          <div className="homework-section-title">Completed</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tasks.filter((t) => t.status === 'completed').map((task) => (
              <div key={task.id} className="task-item" style={{ opacity: 0.9 }}>
                <div className="task-checkbox-circle completed">
                  <CheckCircle2 size={14} color="#FFFFFF" />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="task-title" style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>
                    {task.title}
                  </div>
                  <div className="task-meta">
                    <CheckCircle2 size={11} color="var(--success)" />
                    <span>Verified: 100% Score</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
