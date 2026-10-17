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
  Sparkles,
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
import DiagnosticAssessmentModal from '../components/home/DiagnosticAssessmentModal';
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
  const [diagnosticStatus, setDiagnosticStatus] = useState(null);
  const [diagnosticModalOpen, setDiagnosticModalOpen] = useState(false);

  async function loadWorkspaceData() {
    try {
      setLoading(true);
      const [
        loadedCourses,
        loadedQuizzes,
        loadedAssessments,
        loadedStudents,
        loadedProgress,
        loadedDiagStatus,
      ] = await Promise.all([
        learningService.getCourses(),
        learningService.getQuizzes(),
        learningService.getAssessments(),
        authService.getAllStudents(),
        learningService.getProgress(),
        role !== 'teacher' ? learningService.getDiagnosticStatus() : Promise.resolve(null),
      ]);

      setCourses(loadedCourses || []);
      setQuizzes(loadedQuizzes || []);
      setAssessments(loadedAssessments || []);
      setStudents(loadedStudents || []);
      setProgressData(loadedProgress || null);
      if (loadedDiagStatus) {
        setDiagnosticStatus(loadedDiagStatus);
      }
    } catch (err) {
      console.error('Failed to load workspace data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWorkspaceData();
  }, [role]);

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
    user?.overallMastery !== undefined && user.overallMastery !== null
      ? user.overallMastery
      : progressData?.overallEstimatedMastery !== undefined
      ? progressData.overallEstimatedMastery
      : 0;

  const studentMastery = normalizeMastery(rawMastery);

  const solidConceptsCount = progressData?.conceptBreakdown?.length > 0
    ? progressData.conceptBreakdown.filter((c) => normalizeMastery(c.mastery) >= 70).length
    : allConcepts.filter((c) => normalizeMastery(c.mastery || c.masteryScore || 0) >= 70).length;

  const totalConceptsCount = progressData?.conceptBreakdown?.length || allConcepts.length || 0;

  // Recommended Next Action (Derived dynamically from lowest mastery concept)
  const sortedConcepts = [...allConcepts].sort(
    (a, b) => (a.mastery || a.masteryScore || 0) - (b.mastery || b.masteryScore || 0)
  );
  const targetConcept = sortedConcepts[0] || null;

  const recommendation = targetConcept
    ? {
        title: `${targetConcept.name} Calibration Practice`,
        conceptName: targetConcept.name,
        targetMastery: normalizeMastery(targetConcept.mastery || targetConcept.masteryScore || 0),
        description: `Your estimated readiness for ${targetConcept.name} is ${normalizeMastery(targetConcept.mastery || targetConcept.masteryScore || 0)}%. Completing diagnostic evaluations will calibrate your prerequisite retention.`,
        duration: '10 min',
        questionCount: '5 questions',
        difficulty: 'Adaptive',
        route: '/content/quizzes',
        prerequisitePath: allConcepts.slice(0, 3).map((c, i) => ({
          name: c.name,
          score: normalizeMastery(c.mastery || c.masteryScore || 0),
          status: normalizeMastery(c.mastery || c.masteryScore || 0) >= 70 ? 'solid' : 'developing',
          isTarget: i === 0,
        })),
        reasoning: `Prerequisite calibration for ${targetConcept.name}: Diagnostic practice strengthens retention across continuous evaluations.`,
      }
    : null;

  // Instructor View calculations
  const teacherCourse = user?.courseTaught || primaryCourse?.title || 'Data Structures & Algorithms';
  const cohortCount = students.length;
  const avgCohortMastery =
    cohortCount > 0
      ? Math.round(students.reduce((acc, s) => acc + (s.overallMastery || 0), 0) / cohortCount)
      : 0;

  const weakestConceptInClass = allConcepts.length > 0
    ? {
        name: sortedConcepts[0].name,
        score: normalizeMastery(sortedConcepts[0].mastery || sortedConcepts[0].masteryScore || 0),
        strugglingCount: students.filter((s) => (s.overallMastery || 0) < 50).length,
      }
    : {
        name: 'No concepts recorded yet',
        score: 0,
        strugglingCount: 0,
      };

  const needsAttentionStudents = students.filter((s) => (s.overallMastery || 0) < 50 || s.status === 'Needs Guidance');
  const sessionsToReview = [];

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
                onClick={() => navigate('/dashboard')}
              >
                <Users size={14} strokeWidth={1.5} />
                <span>Cohort Roster</span>
              </button>
            </div>
          </div>

          {/* Quick Hub Navigation Cards for Instructor */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div
              onClick={() => navigate('/teacher/content-upload')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate('/teacher/content-upload'); }}
              style={{
                background: 'var(--surface)',
                borderRadius: '16px',
                border: '1px solid var(--border-hairline)',
                padding: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: 'var(--shadow-card)',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--coral)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-hairline)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'var(--coral-soft)', color: 'var(--coral)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <UploadCloud size={20} strokeWidth={1.5} />
              </div>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-main)' }}>Syllabus Studio</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Ingest PDF / Text</div>
              </div>
            </div>

            <div
              onClick={() => navigate('/content/concepts')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate('/content/concepts'); }}
              style={{
                background: 'var(--surface)',
                borderRadius: '16px',
                border: '1px solid var(--border-hairline)',
                padding: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: 'var(--shadow-card)',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--coral)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-hairline)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Layers size={20} strokeWidth={1.5} />
              </div>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-main)' }}>Concept Map</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Prerequisite DAG</div>
              </div>
            </div>

            <div
              onClick={() => navigate('/content/quizzes')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate('/content/quizzes'); }}
              style={{
                background: 'var(--surface)',
                borderRadius: '16px',
                border: '1px solid var(--border-hairline)',
                padding: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: 'var(--shadow-card)',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--coral)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-hairline)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(234, 179, 8, 0.12)', color: '#CA8A04', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <HelpCircle size={20} strokeWidth={1.5} />
              </div>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-main)' }}>Topic Quizzes</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Bloom Assessments</div>
              </div>
            </div>

            <div
              onClick={() => navigate('/content/coding')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate('/content/coding'); }}
              style={{
                background: 'var(--surface)',
                borderRadius: '16px',
                border: '1px solid var(--border-hairline)',
                padding: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: 'var(--shadow-card)',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--coral)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-hairline)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Code2 size={20} strokeWidth={1.5} />
              </div>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-main)' }}>Coding Sandbox</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Problem Challenges</div>
              </div>
            </div>

            <div
              onClick={() => navigate('/dashboard')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate('/dashboard'); }}
              style={{
                background: 'var(--surface)',
                borderRadius: '16px',
                border: '1px solid var(--border-hairline)',
                padding: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: 'var(--shadow-card)',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--coral)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-hairline)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Users size={20} strokeWidth={1.5} />
              </div>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-main)' }}>Cohort Roster</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Student Tracking</div>
              </div>
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

            {sessionsToReview.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                ✓ No integrity flags or anomalous activity sessions pending review.
              </div>
            ) : (
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
                        <div style={{ marginTop: '4px' }}>
                          <Chip variant="warning" size="sm">
                            Review suggested
                          </Chip>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                            {session.signalText}
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
            )}
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {diagnosticStatus?.completed && (
              <button
                type="button"
                className="btn-ghost-pill btn-compact"
                onClick={() => setDiagnosticModalOpen(true)}
                title="View your initial diagnostic placement scores and calibrated baseline"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(99, 102, 241, 0.1)',
                  borderColor: 'rgba(99, 102, 241, 0.3)',
                  color: 'var(--primary-light)',
                }}
              >
                <Sparkles size={14} strokeWidth={1.5} />
                <span>Placement Calibration</span>
              </button>
            )}
            <button
              type="button"
              className="btn-ghost-pill btn-compact"
              onClick={() => navigate('/content/concepts')}
            >
              <Layers size={14} strokeWidth={1.5} />
              <span>Curriculum Graph</span>
            </button>
          </div>
        </div>

        {/* 1.5 Diagnostic Placement Action Banner */}
        {diagnosticStatus && !diagnosticStatus.completed && (
          <div
            style={{
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.12))',
              border: '1px solid rgba(168,85,247,0.35)',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', maxWidth: '620px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                }}
              >
                <Sparkles size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 600, color: 'var(--text-main)' }}>
                    Initial Placement Diagnostic Available
                  </h3>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: 'rgba(99, 102, 241, 0.2)',
                      color: 'var(--primary-light)',
                    }}
                  >
                    30 Marks • 3 Subjects
                  </span>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Take our comprehensive 30-mark diagnostic test across OOP, DSA, and OS to calibrate Bayesian Knowledge Tracing and establish your baseline tier (Beginner, Intermediate, Advanced).
                </p>
              </div>
            </div>
            <button
              onClick={() => setDiagnosticModalOpen(true)}
              style={{
                padding: '10px 20px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                border: 'none',
                color: '#fff',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
              }}
            >
              <span>Start Diagnostic Test</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* 2. HERO CARD for "Recommended next action" */}
        {recommendation ? (
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
                  Target: {recommendation.conceptName} ({recommendation.targetMastery}%)
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

              <p
                style={{
                  fontSize: '13.5px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.5',
                  marginTop: '6px',
                  marginBottom: 0,
                }}
              >
                {recommendation.description}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
                <Chip variant="default" size="sm">
                  <Clock size={12} strokeWidth={1.5} style={{ marginRight: '4px' }} />
                  {recommendation.duration}
                </Chip>
                <Chip variant="default" size="sm">
                  <HelpCircle size={12} strokeWidth={1.5} style={{ marginRight: '4px' }} />
                  {recommendation.questionCount}
                </Chip>
                <Chip variant="default" size="sm">
                  {recommendation.difficulty}
                </Chip>
              </div>
            </div>

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
        ) : (
          <div
            style={{
              minHeight: '200px',
              borderRadius: '24px',
              background: 'var(--surface)',
              border: '1px solid var(--border-hairline)',
              boxShadow: 'var(--shadow-card)',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em' }}>
              Adaptive Recommendation Engine
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
              Welcome to Your Personalized Learning Portal
            </h2>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: 0, maxWidth: '600px', lineHeight: '1.5' }}>
              No activities or courses loaded yet. Once connected to the live API or after an instructor publishes a syllabus in the studio, adaptive recommendations will appear here automatically.
            </p>
            <div style={{ marginTop: '8px' }}>
              <button
                type="button"
                className="btn-coral-pill btn-compact"
                onClick={() => navigate('/content/concepts')}
              >
                <Layers size={14} strokeWidth={1.5} />
                <span>View Concept Map</span>
              </button>
            </div>
          </div>
        )}

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

        {/* 4. CONCEPT PATH: Horizontal scroller of rounded step cards with mastery chip and arrows */}
        <MiniConceptMap concepts={allConcepts} activeConceptId={targetConcept?.id} />
      </div>

      {/* Right Rail (320px, stacked cards, same card style, 16px gap) */}
      <RightContextSidebar
        recommendation={recommendation}
        pendingQuizzes={pendingQuizzes}
        pendingAssessments={pendingAssessments}
        completedQuizzes={completedQuizzes}
        completedAssessments={completedAssessments}
        totalConcepts={totalConceptsCount}
        masteredConcepts={solidConceptsCount}
        overallProgress={studentMastery}
        courseName={primaryCourse?.title || 'Curriculum Sequence'}
        onOpenWhyThis={recommendation ? () => setWhyThisOpen(true) : undefined}
      />

      {/* "Why this?" Modal with prerequisite path popover */}
      {recommendation && (
        <WhyThisModal
          isOpen={whyThisOpen}
          onClose={() => setWhyThisOpen(false)}
          recommendation={recommendation}
          onStartActivity={() => navigate(recommendation.route)}
        />
      )}

      {/* First-Login Diagnostic Assessment Modal */}
      <DiagnosticAssessmentModal
        isOpen={diagnosticModalOpen}
        onClose={() => setDiagnosticModalOpen(false)}
        onComplete={(newResults) => {
          setDiagnosticStatus({ completed: true, results: newResults });
          loadWorkspaceData();
        }}
      />

      <OnboardingTour role={role} />
    </div>
  );
}

export default HomePage;

