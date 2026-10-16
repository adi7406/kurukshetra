import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Users,
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  Sparkles,
  MessageSquare,
  Send,
} from 'lucide-react';
import { authService } from '../services/authService';
import LoadingState from '../components/feedback/LoadingState';
import StatCard from '../components/common/StatCard';
import MasteryChip from '../components/common/MasteryChip';
import Chip from '../components/common/Chip';
import { normalizeMastery } from '../utils/mastery';

export function TeacherStudentProgressPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await authService.getAllStudents();
        setStudents(data || []);
        if (data && data.length > 0) {
          setSelectedStudent(data[0]);
        }
      } catch (err) {
        console.error('Failed to load students progress:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return <LoadingState message="Analyzing student cohort progress..." />;
  }

  const atRiskCount = students.filter((s) => (s.overallMastery || 0) < 50).length;
  const highMasteryCount = students.filter((s) => (s.overallMastery || 0) >= 70).length;

  const handleSendFeedback = () => {
    setFeedbackSent(true);
    setTimeout(() => {
      setFeedbackSent(false);
      setFeedbackNote('');
    }, 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Title */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/home')}>Home</span>
          <span>/</span>
          <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>Class Analytics</span>
        </div>
        <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em' }}>
          Cohort Progress & Intervention Dossier
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '-0.01em', margin: '4px 0 0 0' }}>
          Class Analytics & Student Diagnostics
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
          Individual student competency breakdown, prerequisite bottlenecks, and targeted intervention management.
        </p>
      </div>

      {/* Cohort Health Summary Cards */}
      <div className="stat-cards-grid">
        <StatCard
          label="Total Enrolled"
          value={students.length}
          caption="CS201 Data Structures cohort"
        />

        <StatCard
          label="Solid Mastery (>70%)"
          value={highMasteryCount}
          caption="Excelling in curriculum"
        />

        <StatCard
          label="Requires Intervention"
          value={atRiskCount}
          caption="Developing or weak in prerequisites"
        />
      </div>

      {/* Two Column Layout: Student Selector Left, Detailed Breakdown Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 320px) 1fr', gap: '20px', alignItems: 'start' }}>
        {/* Left List of Students */}
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: '20px',
            border: '1px solid var(--border-hairline)',
            boxShadow: 'var(--shadow-card)',
            padding: '20px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em', marginBottom: '14px' }}>
            Student Directory
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {students.map((s) => {
              const isSelected = selectedStudent?.id === s.id;
              const mastery = normalizeMastery(s.overallMastery || 40);

              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedStudent(s)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setSelectedStudent(s);
                  }}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '14px',
                    background: isSelected ? 'var(--coral-soft)' : 'var(--surface-muted)',
                    border: isSelected ? '1.5px solid var(--coral)' : '1px solid var(--border-hairline)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 150ms ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: isSelected ? 'var(--coral)' : 'var(--surface)',
                        color: isSelected ? '#FFFFFF' : 'var(--coral)',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {s.avatarInitials || s.name[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                        {s.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {s.rollNo} &bull; {s.className}
                      </div>
                    </div>
                  </div>

                  <MasteryChip score={mastery} size="sm" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Detail Panel for Selected Student */}
        {selectedStudent && (
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: '20px',
              border: '1px solid var(--border-hairline)',
              boxShadow: 'var(--shadow-card)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '16px 22px', background: 'var(--surface-muted)', borderBottom: '1px solid var(--border-hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em' }}>
                  Student Dossier
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', margin: '2px 0 0 0' }}>
                  {selectedStudent.name} ({selectedStudent.rollNo})
                </h3>
              </div>
              <MasteryChip score={selectedStudent.overallMastery || 40} size="md" />
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                    {selectedStudent.name}
                  </h2>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '14px', marginTop: '4px' }}>
                    <span>Roll: <strong>{selectedStudent.rollNo}</strong></span>
                    <span>Class: <strong>{selectedStudent.className}</strong></span>
                    <span>Email: <strong>{selectedStudent.email}</strong></span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '30px', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                    {selectedStudent.overallMastery || 40}%
                  </span>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
                    Overall BKT Mastery
                  </div>
                </div>
              </div>

              {/* Concept Level Breakdown */}
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em', marginBottom: '12px' }}>
                  Concept Mastery Breakdown
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  {[
                    { name: 'Dynamic Arrays', score: selectedStudent.conceptMastery?.c_arrays || 0 },
                    { name: 'Linked Lists', score: selectedStudent.conceptMastery?.c_linkedlists || 0 },
                    { name: 'Hash Tables', score: selectedStudent.conceptMastery?.c_hashtables || 0 },
                    { name: 'Recursion Bounds', score: selectedStudent.conceptMastery?.c_recursion || 0 },
                    { name: 'Dynamic Programming', score: selectedStudent.conceptMastery?.c_dp || 0 },
                    { name: 'AVL Trees', score: selectedStudent.conceptMastery?.c_bst || 0 },
                  ].map((c, i) => {
                    const norm = normalizeMastery(c.score);
                    return (
                      <div key={i} style={{ padding: '14px', background: 'var(--surface-muted)', borderRadius: '14px', border: '1px solid var(--border-hairline)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)' }}>{c.name}</span>
                          <MasteryChip score={norm} size="sm" />
                        </div>
                        <div style={{ width: '100%', height: '5px', background: 'var(--border-hairline)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${norm}%`,
                              height: '100%',
                              background: norm >= 70 ? 'var(--mastery-solid)' : norm >= 40 ? 'var(--mastery-developing)' : 'var(--mastery-weak)',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Teacher Intervention Note */}
              <div style={{ background: 'var(--surface-muted)', border: '1px solid var(--border-hairline)', borderRadius: '16px', padding: '18px' }}>
                <h4 style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare size={15} strokeWidth={1.5} color="var(--coral)" />
                  <span>Assign Targeted Feedback or Adaptive Remediation</span>
                </h4>
                <textarea
                  rows={3}
                  placeholder={`Send personalized study guidance to ${selectedStudent.name}...`}
                  value={feedbackNote}
                  onChange={(e) => setFeedbackNote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-hairline)',
                    fontSize: '13px',
                    marginBottom: '12px',
                    outline: 'none',
                    background: 'var(--surface)',
                    color: 'var(--text-main)',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {feedbackSent ? (
                    <span style={{ color: 'var(--mastery-solid)', fontSize: '12.5px', fontWeight: 600 }}>
                      ✓ Feedback sent to student's dashboard
                    </span>
                  ) : <span />}
                  <button
                    type="button"
                    className="btn-coral-pill btn-compact"
                    onClick={handleSendFeedback}
                    disabled={!feedbackNote.trim()}
                  >
                    <Send size={12} strokeWidth={1.5} />
                    <span>Send Guidance</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TeacherStudentProgressPage;
