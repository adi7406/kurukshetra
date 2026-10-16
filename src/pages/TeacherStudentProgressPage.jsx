import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldAlert,
  Search,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import { authService } from '../services/authService';
import LoadingState from '../components/feedback/LoadingState';

export function TeacherStudentProgressPage() {
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
        setStudents(data);
        if (data.length > 0) {
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

  const atRiskCount = students.filter((s) => (s.overallMastery || 0) < 40).length;
  const highMasteryCount = students.filter((s) => (s.overallMastery || 0) >= 70).length;

  const handleSendFeedback = () => {
    setFeedbackSent(true);
    setTimeout(() => {
      setFeedbackSent(false);
      setFeedbackNote('');
    }, 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span className="badge-clean blue" style={{ fontSize: '10.5px' }}>
            Cohort Dossier
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
            Individual student diagnostics & intervention tracking
          </span>
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          Progress of the Students & Cohort Diagnostics
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
          Detailed learning analytics, concept-level mastery evidence, and personalized intervention management.
        </p>
      </div>

      {/* Cohort Health Summary Cards */}
      <div className="stat-widgets-grid">
        <div className="stat-widget-card">
          <div className="stat-widget-header">
            <span className="stat-widget-title">Total Enrolled</span>
            <div className="stat-circle-icon blue">
              <Users size={16} />
            </div>
          </div>
          <div className="stat-number-row">
            <span className="stat-huge-number">{students.length}</span>
            <span className="stat-unit-text">students</span>
          </div>
          <span className="stat-footer-text">CS201 Data Structures cohort</span>
        </div>

        <div className="stat-widget-card">
          <div className="stat-widget-header">
            <span className="stat-widget-title">Mastery &gt; 70% (Solid)</span>
            <div className="stat-circle-icon green">
              <Award size={16} />
            </div>
          </div>
          <div className="stat-number-row">
            <span className="stat-huge-number">{highMasteryCount}</span>
            <span className="stat-unit-text">excelling</span>
          </div>
          <span className="stat-footer-text">Ready for advanced graph algorithms</span>
        </div>

        <div className="stat-widget-card">
          <div className="stat-widget-header">
            <span className="stat-widget-title">Mastery &lt; 40% (Weak)</span>
            <div className="stat-circle-icon amber">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="stat-number-row">
            <span className="stat-huge-number">{atRiskCount}</span>
            <span className="stat-unit-text">learners flagged</span>
          </div>
          <span className="stat-footer-text">Requires prerequisite intervention</span>
        </div>
      </div>

      {/* Two Column Layout: Student Selector Left, Detailed Breakdown Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
        {/* Left List of Students */}
        <div className="saas-card" style={{ padding: '16px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.04em', marginBottom: '12px' }}>
            Student Directory
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {students.map((s) => {
              const isSelected = selectedStudent?.id === s.id;
              const mastery = s.overallMastery || 40;

              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedStudent(s)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: isSelected ? 'var(--primary-subtle)' : '#FFFFFF',
                    border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 120ms ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="avatar-circle" style={{ width: '30px', height: '30px', fontSize: '11px', borderRadius: '6px' }}>
                      {s.avatarInitials || s.name[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
                        {s.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {s.rollNo} &bull; {s.className}
                      </div>
                    </div>
                  </div>

                  <span className={`badge-clean ${mastery >= 75 ? 'green' : mastery >= 50 ? 'blue' : 'amber'}`}>
                    {mastery}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Detail Panel for Selected Student */}
        {selectedStudent && (
          <div className="saas-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 0 }}>
            <div style={{ padding: '12px 18px', background: 'var(--surface-muted)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
                Student Progress Dossier &bull; {selectedStudent.name} ({selectedStudent.rollNo})
              </span>
              <span className={`badge-clean ${selectedStudent.overallMastery >= 75 ? 'green' : selectedStudent.overallMastery >= 50 ? 'blue' : 'red'}`}>
                {selectedStudent.overallMastery >= 75 ? 'Excelling' : selectedStudent.overallMastery >= 50 ? 'Developing' : 'Needs Support'}
              </span>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)' }}>
                    {selectedStudent.name}
                  </h2>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', display: 'flex', gap: '12px', marginTop: '4px' }}>
                    <span>Roll: <strong>{selectedStudent.rollNo}</strong></span>
                    <span>Class: <strong>{selectedStudent.className}</strong></span>
                    <span>Phone: <strong>{selectedStudent.phone}</strong></span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '28px', fontWeight: '800', color: selectedStudent.overallMastery >= 75 ? 'var(--success)' : 'var(--primary)', letterSpacing: '-0.02em' }}>
                    {selectedStudent.overallMastery}%
                  </span>
                  <div style={{ fontSize: '11px', color: 'var(--text-light)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.04em' }}>
                    Overall BKT Mastery
                  </div>
                </div>
              </div>

              {/* Concept Level Breakdown */}
              <h3 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.04em', marginBottom: '12px' }}>
                Concept Mastery Levels
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                {[
                  { name: 'Dynamic Arrays', score: selectedStudent.conceptMastery?.c_arrays || 0 },
                  { name: 'Linked Lists', score: selectedStudent.conceptMastery?.c_linkedlists || 0 },
                  { name: 'Hash Tables', score: selectedStudent.conceptMastery?.c_hashtables || 0 },
                  { name: 'Divide & Conquer', score: selectedStudent.conceptMastery?.c_recursion || 0 },
                  { name: 'Dynamic Programming', score: selectedStudent.conceptMastery?.c_dp || 0 },
                  { name: 'Binary Search Trees', score: selectedStudent.conceptMastery?.c_bst || 0 },
                ].map((c, i) => (
                  <div key={i} style={{ padding: '12px', background: 'var(--surface-muted)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-main)' }}>{c.name}</span>
                      <span style={{ fontWeight: '700', color: c.score >= 70 ? 'var(--success)' : c.score >= 40 ? 'var(--primary)' : 'var(--danger)' }}>{c.score}%</span>
                    </div>
                    <div style={{ width: '100%', height: '5px', background: 'var(--surface)', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${c.score}%`,
                          height: '100%',
                          background: c.score >= 70 ? 'var(--success)' : c.score >= 40 ? 'var(--primary)' : 'var(--danger)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Teacher Intervention Note */}
              <div style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageSquare size={14} color="var(--primary)" />
                  <span>Assign Targeted Feedback or Adaptive Practice</span>
                </h4>
                <textarea
                  rows={3}
                  placeholder={`Send personalized study guidance to ${selectedStudent.name}...`}
                  value={feedbackNote}
                  onChange={(e) => setFeedbackNote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    fontSize: '13px',
                    marginBottom: '10px',
                    outline: 'none',
                    background: '#FFFFFF',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {feedbackSent ? (
                    <span style={{ color: 'var(--success)', fontSize: '12px', fontWeight: '600' }}>
                      Feedback sent to student's dashboard
                    </span>
                  ) : <span />}
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ padding: '6px 14px', fontSize: '12px' }}
                    onClick={handleSendFeedback}
                    disabled={!feedbackNote.trim()}
                  >
                    Send Intervention Guidance
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
