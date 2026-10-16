import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Clock,
  BookOpen,
  HelpCircle,
  Code2,
  CheckCircle2,
  Layers,
  UploadCloud,
  Users,
  Award,
  ChevronRight,
  Zap,
  Check,
  FileText,
  Shield,
  Terminal,
  BarChart2,
  AlertTriangle,
  Sparkles,
  Flame,
  Info,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { learningService } from '../services/learningService';
import { authService } from '../services/authService';
import LoadingState from '../components/feedback/LoadingState';
import MasteryBadge from '../components/common/MasteryBadge';
import MasteryRing from '../components/common/MasteryRing';
import Sparkline from '../components/common/Sparkline';
import WhyThisModal from '../components/home/WhyThisModal';
import MiniConceptMap from '../components/home/MiniConceptMap';
import ClassHeatmap from '../components/home/ClassHeatmap';
import PendingApprovalQueue from '../components/home/PendingApprovalQueue';
import RightContextSidebar from '../components/home/RightContextSidebar';
import OnboardingTour from '../components/common/OnboardingTour';
import { normalizeMastery, getMasteryLevel } from '../utils/mastery';

export function HomePage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [progressData, setProgressData] = useState(null);
  const [whyThisOpen, setWhyThisOpen] = useState(false);

  useEffect(() => {
    async function loadWorkspaceData() {
      try {
        setLoading(true);
        const [loadedCourses, loadedQuizzes, loadedAssessments, loadedStudents, loadedProgress] =
          await Promise.all([
            learningService.getCourses(),
            learningService.getQuizzes(),
            learningService.getAssessments(),
            authService.getAllStudents(),
            learningService.getProgress(),
          ]);

        setCourses(loadedCourses || []);
        setQuizzes(loadedQuizzes || []);
        setAssessments(loadedAssessments || []);
        setStudents(loadedStudents || []);
        setProgressData(loadedProgress || null);
      } catch (err) {
        console.error('Failed to load live workspace data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadWorkspaceData();
  }, []);

  if (loading) {
    return <LoadingState message="Loading command center..." />;
  }

  const primaryCourse = courses[0] || null;
  const firstName = user?.name ? user.name.split(' ')[0] : 'Learner';

  // Greeting by time of day (Section 3.1)
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // All Concepts flat list
  const allConcepts = [];
  courses.forEach((c) => {
    c.modules?.forEach((m) => {
      m.concepts?.forEach((concept) => {
        allConcepts.push({ ...concept, courseTitle: c.title, moduleTitle: m.title });
      });
    });
  });

  // Dynamic calculations for Student View
  const completedQuizzes = quizzes.filter((q) => q.status === 'completed');
  const completedAssessments = assessments.filter((a) => a.status === 'completed');
  const pendingQuizzes = quizzes.filter((q) => q.status !== 'completed');
  const pendingAssessments = assessments.filter((a) => a.status !== 'completed');
  const pendingTaskCount = pendingQuizzes.length + pendingAssessments.length;

  const rawMastery =
    user?.overallMastery !== undefined
      ? user.overallMastery
      : progressData?.overallEstimatedMastery !== undefined
      ? progressData.overallEstimatedMastery
      : 78;

  const studentMastery = normalizeMastery(rawMastery);

  const solidConceptsCount = progressData?.conceptBreakdown
    ? progressData.conceptBreakdown.filter((c) => normalizeMastery(c.mastery) >= 70).length
    : 3;
  const totalConceptsCount = progressData?.conceptBreakdown?.length || allConcepts.length || 6;

  // Recommended Next Action (Section 3.2 & 3.3)
  const targetConcept = allConcepts.find((c) => c.name?.includes('Hash Tables')) || allConcepts[1] || {
    name: 'Hash Tables & Collision Resolution',
  };

  const recommendation = {
    title: 'Collision Resolution & Load Factor Quiz',
    conceptName: targetConcept.name || 'Hash Tables & Collision Resolution',
    targetMastery: 48,
    description: 'Your estimated mastery of Hash Tables is 48% (Developing). Prerequisite Hash Functions (52%) was identified as the primary bottleneck.',
    duration: '8 min',
    questionCount: '5 questions',
    difficulty: 'Adaptive',
    route: '/content/quizzes',
    prerequisitePath: [
      { name: 'Dynamic Arrays & Memory', score: 92, status: 'solid' },
      { name: 'Hash Functions & Distribution', score: 52, status: 'developing', isWeakest: true },
      { name: targetConcept.name || 'Hash Tables & Collision Resolution', score: 48, status: 'developing', isTarget: true },
    ],
    reasoning: 'Your mastery of Hash Tables is 48% (Developing). Diagnostic quiz attempts show error patterns clustering around hash collision handling, where prerequisite concept Hash Functions (52%) is the primary bottleneck. Practicing this diagnostic quiz strengthens prerequisite retention before advancing to hierarchical tree structures.',
  };

  // Dynamic calculations for Teacher View
  const teacherCourse = user?.courseTaught || primaryCourse?.title || 'Data Structures & Algorithms';
  const cohortCount = students.length;
  const avgCohortMastery =
    cohortCount > 0
      ? Math.round(students.reduce((acc, s) => acc + (s.overallMastery || 0), 0) / cohortCount)
      : 0;

  // Weakest Concept in Class for Teacher Dashboard (Section 5.5)
  const weakestConceptInClass = {
    name: 'Dynamic Programming & Memoization',
    score: 38,
    strugglingCount: 6,
  };

  // Needs Attention students list (Section 5.1)
  const needsAttentionStudents = students.filter((s) => s.overallMastery < 50 || s.status === 'Needs Guidance');

  // Sessions to Review (Section 5.2)
  const sessionsToReview = [
    {
      id: 'rev_02',
      studentName: 'Rohan Mehra',
      assessmentTitle: 'LRU Cache Design (Doubly-Linked Sentinel)',
      signalText: 'Review suggested · Sudden large paste (+340 chars) at 02:14',
      timestamp: 'Today at 01:14 PM',
      testsPassed: '18/18 Tests Passed',
    },
  ];

  // =============================================================
  // TEACHER / INSTRUCTOR COMMAND CENTER (Section 5)
  // =============================================================
  if (role === 'teacher') {
    return (
      <div style={{ padding: '0 24px 32px 24px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {/* Compact Greeting (Section 3.1 & 5) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              {timeGreeting}, {user?.name || 'Instructor'}.
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {needsAttentionStudents.length + sessionsToReview.length} student items require your review today.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate('/teacher/content-upload')}
              style={{ padding: '7px 14px', fontSize: '12.5px' }}
            >
              <UploadCloud size={14} />
              <span>Syllabus & Content</span>
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/teacher/student-progress')}
              style={{ padding: '7px 14px', fontSize: '12.5px' }}
            >
              <Users size={14} />
              <span>Full Class Roster</span>
            </button>
          </div>
        </div>

        {/* Top 2 Actionable Review Panels: "Who needs me right now?" (Sections 5.1 & 5.2) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
          {/* 5.1 Needs Attention Panel */}
          <div className="saas-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={16} color="#FBBF24" />
                <h3 style={{ fontSize: '14.5px', fontWeight: '700' }}>Needs Attention</h3>
              </div>
              <span className="badge-clean amber">{needsAttentionStudents.length} Students</span>
            </div>

            {needsAttentionStudents.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                No students currently in need of concept intervention.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {needsAttentionStudents.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => navigate(`/teacher/student-progress?studentId=${s.id}`)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      background: 'var(--surface-muted)',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'border-color 140ms ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary-border)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                        {s.name} ({s.rollNo})
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#FBBF24', marginTop: '2px' }}>
                        Struggling with {weakestConceptInClass.name} (3+ attempts)
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MasteryBadge score={s.overallMastery} size="sm" />
                      <ChevronRight size={13} color="var(--text-light)" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5.2 Sessions to Review Panel */}
          <div className="saas-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={16} color="var(--primary)" />
                <h3 style={{ fontSize: '14.5px', fontWeight: '700' }}>Sessions to Review</h3>
              </div>
              <span className="badge-clean blue">{sessionsToReview.length} Flagged</span>
            </div>

            {sessionsToReview.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                No sessions to review. All clear.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sessionsToReview.map((session) => (
                  <div
                    key={session.id}
                    style={{
                      padding: '12px 14px',
                      background: 'rgba(245, 158, 11, 0.06)',
                      borderRadius: '8px',
                      border: '1px solid var(--warning-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
                          {session.studentName} &bull; {session.assessmentTitle}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#FBBF24', fontWeight: '600', marginTop: '2px' }}>
                          {session.signalText}
                        </div>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>
                        {session.timestamp}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(245, 158, 11, 0.2)', paddingTop: '6px' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => navigate(`/teacher/replay/${session.id}`)}
                        style={{ padding: '4px 10px', fontSize: '11.5px', borderColor: 'var(--warning-border)' }}
                      >
                        <Terminal size={12} />
                        <span>Open Replay</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 5.5 Class Average Mastery with Context */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div className="saas-card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
              Class Average Mastery
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#34D399', letterSpacing: '-0.02em' }}>
                {avgCohortMastery}%
              </div>
              <MasteryBadge score={avgCohortMastery} size="sm" />
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Calculated across all {allConcepts.length || 6} concepts
            </div>
          </div>

          <div className="saas-card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
              Weakest Concept in Class
            </div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>
              {weakestConceptInClass.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
              <MasteryBadge score={weakestConceptInClass.score} size="sm" />
              <span style={{ fontSize: '11.5px', color: 'var(--text-light)' }}>
                {weakestConceptInClass.strugglingCount} students developing
              </span>
            </div>
          </div>

          <div className="saas-card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
              Active Cohort Size
            </div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              {cohortCount}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Enrolled in {teacherCourse.split(':')[0]}
            </div>
          </div>
        </div>

        {/* 5.3 Class Mastery Heatmap */}
        <ClassHeatmap students={students} concepts={allConcepts} />

        {/* 5.4 Pending Approval Queue */}
        <PendingApprovalQueue />
      </div>
    );
  }

  // =============================================================
  // STUDENT WORK-FIRST COMMAND CENTER (Priority 1)
  // =============================================================
  return (
    <div style={{ padding: '0 24px 32px 24px' }}>
      <div className="home-workspace-container">
        {/* Main Learning Center Column (Visual Priority) */}
        <div className="home-workspace-main">
          {/* 3.1 Compact Greeting */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                {timeGreeting}, {firstName}.
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                You have {pendingTaskCount} {pendingTaskCount === 1 ? 'activity' : 'activities'} scheduled for practice today.
              </p>
            </div>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/content/concepts')}
              style={{ padding: '6px 14px', fontSize: '12.5px' }}
            >
              <Layers size={14} />
              <span>Full Concept Graph</span>
            </button>
          </div>

          {/* 3.2 RECOMMENDED NEXT ACTION CARD (POSITIONED FIRST!) */}
          <div
            className="saas-card"
            style={{
              padding: '20px 22px',
              borderRadius: '12px',
              background: 'var(--surface)',
              border: '1px solid var(--primary-border)',
              borderLeft: '4px solid var(--primary)',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ flex: 1, minWidth: '280px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'var(--primary)',
                      color: '#FFFFFF',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Recommended Next Action
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                    Target: <strong>{recommendation.conceptName}</strong> ({recommendation.targetMastery}% · Developing)
                  </span>
                </div>

                <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px' }}>
                  {recommendation.title}
                </h2>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.5', maxWidth: '640px' }}>
                  {recommendation.description}
                </p>

                {/* Restrained metadata row */}
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '14px', fontSize: '12px', color: 'var(--text-light)', marginTop: '12px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Clock size={13} />
                    <span>Estimated duration: <strong>{recommendation.duration}</strong></span>
                  </span>
                  <span>&bull;</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <HelpCircle size={13} />
                    <span>{recommendation.questionCount}</span>
                  </span>
                  <span>&bull;</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Sparkles size={13} color="var(--primary)" />
                    <span>{recommendation.difficulty} Diagnostic</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons: Start Activity & Why This? */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setWhyThisOpen(true)}
                  style={{ padding: '8px 14px', fontSize: '12.5px' }}
                  title="Inspect adaptive prerequisite reasoning"
                >
                  <Info size={14} color="var(--primary)" />
                  <span>Why this?</span>
                </button>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => navigate(recommendation.route)}
                  style={{ padding: '8px 18px', fontSize: '13px' }}
                >
                  <span>Start Activity</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* 3.4 KPIs ROW BENEATH THE ACTION CARD */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
            {/* KPI 1: Overall Concept Mastery (Circular Ring) */}
            <div className="saas-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Overall Mastery
                </span>
                <TrendingUp size={14} color="var(--primary)" />
              </div>
              <MasteryRing score={studentMastery} size={84} strokeWidth={7} />
            </div>

            {/* KPI 2: Concepts Mastered */}
            <div className="saas-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Concepts Mastered
                  </span>
                  <Layers size={14} color="var(--primary)" />
                </div>
                <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                  {solidConceptsCount} <span style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text-light)' }}>of {totalConceptsCount}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                <span className="badge-clean green" style={{ fontSize: '10.5px' }}>
                  {Math.round((solidConceptsCount / (totalConceptsCount || 1)) * 100)}% of curriculum
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>Solid (&gt;70%)</span>
              </div>
            </div>

            {/* KPI 3: Current Learning Streak */}
            <div className="saas-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Learning Streak
                  </span>
                  <Flame size={14} color="#F97316" />
                </div>
                <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                  4 <span style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text-light)' }}>Days Active</span>
                </div>
              </div>
              <div style={{ fontSize: '11.5px', color: '#10B981', marginTop: '8px', fontWeight: '600' }}>
                Daily practice maintained
              </div>
            </div>

            {/* KPI 4: Practice Time This Week */}
            <div className="saas-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Practiced This Week
                  </span>
                  <Clock size={14} color="var(--primary)" />
                </div>
                <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                  3.8 <span style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text-light)' }}>hrs</span>
                </div>
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '8px' }}>
                Across quizzes & code sandbox
              </div>
            </div>
          </div>

          {/* 3.6 MINI CONCEPT-MAP PREVIEW */}
          <MiniConceptMap concepts={allConcepts} activeConceptId={targetConcept.id} />

          {/* Quick Learning Focus Sandbox Card */}
          <div
            className="saas-card"
            style={{
              padding: '18px 20px',
              borderRadius: '12px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Code2 size={16} color="var(--primary)" />
                <div>
                  <h3 style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
                    Active Topic: Hash Collisions & Open Addressing
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '2px', margin: 0 }}>
                    Linear probing, quadratic probing, and separate chaining algorithms
                  </p>
                </div>
              </div>

              <span className="badge-clean blue" style={{ fontSize: '11px' }}>
                In Progress
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '12px',
                marginTop: '12px',
              }}
            >
              <div
                onClick={() => navigate('/content/quizzes')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate('/content/quizzes'); }}
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: 'var(--surface-muted)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'border-color 140ms ease',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                    Diagnostic Quiz
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-light)', marginTop: '2px' }}>
                    5 adaptive questions &bull; 8 min
                  </div>
                </div>
                <ArrowRight size={14} color="var(--primary)" />
              </div>

              <div
                onClick={() => navigate('/content/coding')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate('/content/coding'); }}
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: 'var(--surface-muted)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'border-color 140ms ease',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                    Coding Sandbox
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-light)', marginTop: '2px' }}>
                    Implement HashTable class & handle collisions
                  </div>
                </div>
                <ArrowRight size={14} color="var(--primary)" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Contextual Sidebar Column (Secondary Context) */}
        <div className="home-workspace-sidebar">
          <RightContextSidebar
            recommendation={recommendation}
            pendingQuizzes={pendingQuizzes}
            pendingAssessments={pendingAssessments}
            completedQuizzes={completedQuizzes}
            completedAssessments={completedAssessments}
            onOpenWhyThis={() => setWhyThisOpen(true)}
          />
        </div>
      </div>

      {/* 3.3 Functional "Why this?" Modal Dialog */}
      <WhyThisModal
        isOpen={whyThisOpen}
        onClose={() => setWhyThisOpen(false)}
        recommendation={recommendation}
        onStartActivity={() => navigate(recommendation.route)}
      />

      {/* 8. First-run Onboarding Tour */}
      <OnboardingTour role={role} />
    </div>
  );
}

export default HomePage;
