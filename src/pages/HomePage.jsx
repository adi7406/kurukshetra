import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Clock,
  HelpCircle,
  Code2,
  CheckCircle2,
  Layers,
  UploadCloud,
  Users,
  Flame,
  Info,
  TrendingUp,
  AlertTriangle,
  Terminal,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { learningService } from '../services/learningService';
import { authService } from '../services/authService';
import LoadingState from '../components/feedback/LoadingState';
import StatCard from '../components/common/StatCard';
import ProgressRing from '../components/common/ProgressRing';
import RailCard from '../components/common/RailCard';
import Chip from '../components/common/Chip';
import MasteryChip from '../components/common/MasteryChip';
import WhyThisModal from '../components/home/WhyThisModal';
import MiniConceptMap from '../components/home/MiniConceptMap';
import ClassHeatmap from '../components/home/ClassHeatmap';
import PendingApprovalQueue from '../components/home/PendingApprovalQueue';
import RightContextSidebar from '../components/home/RightContextSidebar';
import OnboardingTour from '../components/common/OnboardingTour';
import { normalizeMastery } from '../utils/mastery';

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
        console.error('Failed to load workspace data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadWorkspaceData();
  }, []);

  if (loading) {
    return <LoadingState message="Loading your Pathwise workspace..." />;
  }

  const primaryCourse = courses[0] || null;
  const firstName = user?.name ? user.name.split(' ')[0] : 'Learner';

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

  // Recommended Next Action
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

  // Instructor View calculations
  const teacherCourse = user?.courseTaught || primaryCourse?.title || 'Data Structures & Algorithms';
  const cohortCount = students.length;
  const avgCohortMastery =
    cohortCount > 0
      ? Math.round(students.reduce((acc, s) => acc + (s.overallMastery || 0), 0) / cohortCount)
      : 0;

  const weakestConceptInClass = {
    name: 'Dynamic Programming & Memoization',
    score: 38,
    strugglingCount: 6,
  };

  const needsAttentionStudents = students.filter((s) => s.overallMastery < 50 || s.status === 'Needs Guidance');

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
  // INSTRUCTOR HOME VIEW
  // =============================================================
  if (role === 'teacher') {
    return (
      <div className="home-workspace-container">
        {/* Main Column */}
        <div className="home-workspace-main">
          {/* 1. Greeting line (24px, weight 600) with grey subline */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '-0.01em', margin: 0 }}>
                {timeGreeting}, {user?.name || 'Instructor'}
              </h1>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
                {needsAttentionStudents.length + sessionsToReview.length} student items require your review today in {teacherCourse.split(':')[0]}.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                className="btn-coral-pill btn-compact"
                onClick={() => navigate('/teacher/content-upload')}
              >
                <UploadCloud size={14} strokeWidth={1.5} />
                <span>Upload Syllabus</span>
              </button>
              <button
                type="button"
                className="btn-ghost-pill btn-compact"
                onClick={() => navigate('/teacher/student-progress')}
              >
                <Users size={14} strokeWidth={1.5} />
                <span>Class Roster</span>
              </button>
            </div>
          </div>

          {/* 2. "Needs Attention" List */}
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: '20px',
              border: '1px solid var(--border-hairline)',
              boxShadow: 'var(--shadow-card)',
              padding: '22px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
                  Intervention Queue
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', margin: '2px 0 0 0' }}>
                  Needs Attention
                </h3>
              </div>
              <Chip variant="warning" size="sm">
                {needsAttentionStudents.length} Students
              </Chip>
            </div>

            {needsAttentionStudents.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                All students currently meeting concept mastery targets.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {needsAttentionStudents.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => navigate(`/teacher/student-progress?studentId=${s.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') navigate(`/teacher/student-progress?studentId=${s.id}`);
                    }}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 14px',
                      background: 'var(--surface-muted)',
                      borderRadius: '14px',
                      border: '1px solid var(--border-hairline)',
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--coral)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-hairline)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-main)' }}>
                        {s.name} <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: '12px' }}>({s.rollNo})</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--mastery-developing)', marginTop: '2px', fontWeight: 500 }}>
                        Struggling with {weakestConceptInClass.name} (3+ attempts)
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <MasteryChip score={s.overallMastery} size="sm" />
                      <ChevronRight size={15} strokeWidth={1.5} color="var(--text-secondary)" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. "Sessions to review" List with "Open replay" pills */}
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: '20px',
              border: '1px solid var(--border-hairline)',
              boxShadow: 'var(--shadow-card)',
              padding: '22px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
                  Integrity & Verification
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', margin: '2px 0 0 0' }}>
                  Sessions to Review
                </h3>
              </div>
              <Chip variant="warning" size="sm">
                {sessionsToReview.length} Flagged
              </Chip>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sessionsToReview.map((session) => (
                <div
                  key={session.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '14px',
                    background: 'var(--surface-muted)',
                    border: '1px solid var(--border-hairline)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-main)' }}>
                        {session.studentName} &bull; {session.assessmentTitle}
                      </div>
                      {/* Integrity signal: amber chip with wording "Review suggested", never red and never "cheating" */}
                      <div style={{ marginTop: '4px' }}>
                        <Chip variant="warning" size="sm">
                          Review suggested
                        </Chip>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                          Sudden large paste (+340 chars) at 02:14
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                      {session.timestamp}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid var(--border-hairline)' }}>
                    <button
                      type="button"
                      className="btn-ghost-pill btn-compact"
                      onClick={() => navigate(`/teacher/replay/${session.id}`)}
                    >
                      <Terminal size={13} strokeWidth={1.5} />
                      <span>Open Replay</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Class Mastery Heatmap Card */}
          <ClassHeatmap students={students} concepts={allConcepts} />
        </div>

        {/* Right Rail for Instructor View */}
        <aside
          className="home-workspace-sidebar"
          aria-label="Instructor Sidebar"
          style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}
        >
          {/* Cohort Mastery Ring */}
          <RailCard title="Cohort Mastery">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <ProgressRing progress={avgCohortMastery} size={64} strokeWidth={5} color="var(--mastery-solid)" />
              <div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)' }}>
                  {avgCohortMastery}% Average
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Across {cohortCount} students
                </div>
              </div>
            </div>
          </RailCard>

          {/* Weakest Concepts Card */}
          <RailCard title="Weakest Concept">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
                {weakestConceptInClass.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <MasteryChip score={weakestConceptInClass.score} size="sm" />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {weakestConceptInClass.strugglingCount} students developing
                </span>
              </div>
            </div>
          </RailCard>

          {/* Pending Approvals Checklist with Approve/Edit pills */}
          <PendingApprovalQueue />
        </aside>
      </div>
    );
  }

  // =============================================================
  // STUDENT WORK-FIRST COMMAND CENTER
  // =============================================================
  return (
    <div className="home-workspace-container">
      {/* Main Column */}
      <div className="home-workspace-main">
        {/* 1. Greeting Line (24px, weight 600) with grey subline */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '-0.01em', margin: 0 }}>
              {timeGreeting}, {firstName}
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
              You have {pendingTaskCount} {pendingTaskCount === 1 ? 'activity' : 'activities'} scheduled for practice today.
            </p>
          </div>

          <button
            type="button"
            className="btn-ghost-pill btn-compact"
            onClick={() => navigate('/content/concepts')}
          >
            <Layers size={14} strokeWidth={1.5} />
            <span>Curriculum Graph</span>
          </button>
        </div>

        {/* 2. HERO CARD for "Recommended next action" */}
        {/* large (min 260px), 24px radius, soft coral-to-warm gradient on one side showing a mini concept-path graphic, title, one-line reason, meta chips (8 min · 5 questions · Adaptive), coral pill "Start activity" button and ghost pill "Why this?" button that opens popover with prerequisite path. No left border strip. */}
        <div
          className="hero-action-card"
          style={{
            minHeight: '260px',
            borderRadius: '24px',
            background: 'var(--surface)',
            border: '1px solid var(--border-hairline)',
            boxShadow: 'var(--shadow-card)',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Soft coral-to-warm gradient background graphic */}
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: '40%',
              background: 'radial-gradient(ellipse at 80% 30%, var(--coral-soft) 0%, transparent 70%)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
            aria-hidden="true"
          />

          <div style={{ position: 'relative', zIndex: 1, maxWidth: '640px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--coral)',
                  background: 'var(--coral-soft)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-pill)',
                }}
              >
                Recommended Next Action
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Target: {recommendation.conceptName} (48% · Developing)
              </span>
            </div>

            <h2
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: 'var(--text-main)',
                letterSpacing: '-0.01em',
                margin: '6px 0 0 0',
              }}
            >
              {recommendation.title}
            </h2>

            {/* One-line reason */}
            <p
              style={{
                fontSize: '13.5px',
                color: 'var(--text-secondary)',
                lineHeight: '1.5',
                marginTop: '6px',
                marginBottom: 0,
              }}
            >
              Strengthen Hash Functions bottleneck retention before advancing to hierarchical tree structures.
            </p>

            {/* Meta chips (8 min · 5 questions · Adaptive) */}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
              <Chip variant="default" size="sm">
                <Clock size={12} strokeWidth={1.5} style={{ marginRight: '4px' }} />
                8 min
              </Chip>
              <Chip variant="default" size="sm">
                <HelpCircle size={12} strokeWidth={1.5} style={{ marginRight: '4px' }} />
                5 questions
              </Chip>
              <Chip variant="default" size="sm">
                Adaptive
              </Chip>
            </div>
          </div>

          {/* Buttons: coral pill "Start activity" + ghost pill "Why this?" */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '22px', position: 'relative', zIndex: 1 }}>
            <button
              type="button"
              className="btn-coral-pill"
              onClick={() => navigate(recommendation.route)}
            >
              <span>Start activity</span>
              <ArrowRight size={14} strokeWidth={1.5} />
            </button>

            <button
              type="button"
              className="btn-ghost-pill"
              onClick={() => setWhyThisOpen(true)}
            >
              <Info size={14} strokeWidth={1.5} color="var(--text-secondary)" />
              <span>Why this?</span>
            </button>
          </div>
        </div>

        {/* 3. ROW OF 3-4 COMPACT STAT CARDS */}
        {/* Each has small uppercase grey label, large number (28px weight 600), one grey caption. No tinted inner boxes. */}
        <div className="stat-cards-grid">
          {/* Stat 1: Mastery Ring */}
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: '20px',
              border: '1px solid var(--border-hairline)',
              boxShadow: 'var(--shadow-card)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Overall Mastery
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '8px 0' }}>
              <div style={{ fontSize: '28px', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                {studentMastery}%
              </div>
              <ProgressRing progress={studentMastery} size={46} strokeWidth={4} color="var(--coral)" />
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Curriculum average
            </div>
          </div>

          {/* Stat 2: Concepts Mastered */}
          <StatCard
            label="Concepts Mastered"
            value={`${solidConceptsCount} of ${totalConceptsCount}`}
            caption="Solid mastery (&gt;70%)"
          />

          {/* Stat 3: Streak */}
          <StatCard
            label="Streak"
            value="4 days"
            caption="Daily practice maintained"
          />

          {/* Stat 4: Hours this week */}
          <StatCard
            label="Hours This Week"
            value="3.8 hrs"
            caption="Across quizzes & code"
          />
        </div>

        {/* 4. CONCEPT PATH: Horizontal scroller of rounded step cards with mastery chip and arrows; recommended step has coral outline and Next pill */}
        <MiniConceptMap concepts={allConcepts} activeConceptId={targetConcept.id} />
      </div>

      {/* Right Rail (320px, stacked cards, same card style, 16px gap) */}
      <RightContextSidebar
        recommendation={recommendation}
        pendingQuizzes={pendingQuizzes}
        pendingAssessments={pendingAssessments}
        completedQuizzes={completedQuizzes}
        completedAssessments={completedAssessments}
        onOpenWhyThis={() => setWhyThisOpen(true)}
      />

      {/* "Why this?" Modal with prerequisite path popover */}
      <WhyThisModal
        isOpen={whyThisOpen}
        onClose={() => setWhyThisOpen(false)}
        recommendation={recommendation}
        onStartActivity={() => navigate(recommendation.route)}
      />

      <OnboardingTour role={role} />
    </div>
  );
}

export default HomePage;
