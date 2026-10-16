import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Award,
  AlertCircle,
  HelpCircle,
  Info,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { learningService } from '../services/learningService';
import LoadingState from '../components/feedback/LoadingState';

export function ProgressPage() {
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadProgress() {
      try {
        setLoading(true);
        const data = await learningService.getProgress();
        setProgressData(data);
      } catch (err) {
        console.error('Failed to load progress data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProgress();
  }, []);

  if (loading) {
    return <LoadingState message="Calculating evidence-based concept mastery..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Student Learning Progress & Mastery Evidence</h1>
        <p style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>
          Detailed prerequisite readiness tracked across verified quizzes, coding assessments, and viva explanations.
        </p>
      </div>

      {/* Policy Disclaimer Note */}
      <div
        className="studdy-card"
        style={{
          background: 'var(--surface-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 18px',
        }}
      >
        <Info size={20} color="var(--primary)" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
          <strong>Assessment Policy:</strong> {progressData?.disclaimer}
        </span>
      </div>

      {/* 4 Stat Cards */}
      <div className="stat-widgets-grid">
        <div className="stat-widget-card">
          <div className="stat-widget-header">
            <span className="stat-widget-title">Overall Estimated Mastery</span>
            <div className="stat-circle-icon blue">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="stat-number-row">
            <span className="stat-huge-number">{progressData?.overallEstimatedMastery}%</span>
            <span className="stat-unit-text">readiness</span>
          </div>
          <span className="stat-footer-text">Calculated via BKT update model</span>
        </div>

        <div className="stat-widget-card">
          <div className="stat-widget-header">
            <span className="stat-widget-title">Mastered Concepts</span>
            <div className="stat-circle-icon green">
              <Award size={18} />
            </div>
          </div>
          <div className="stat-number-row">
            <span className="stat-huge-number">{progressData?.completedConceptsCount}</span>
            <span className="stat-unit-text">concepts</span>
          </div>
          <span className="stat-footer-text">High evidence (&gt;75%)</span>
        </div>

        <div className="stat-widget-card">
          <div className="stat-widget-header">
            <span className="stat-widget-title">Developing Concepts</span>
            <div className="stat-circle-icon cyan">
              <Layers size={18} />
            </div>
          </div>
          <div className="stat-number-row">
            <span className="stat-huge-number">{progressData?.developingConceptsCount}</span>
            <span className="stat-unit-text">in progress</span>
          </div>
          <span className="stat-footer-text">50% - 74% mastery range</span>
        </div>

        <div className="stat-widget-card">
          <div className="stat-widget-header">
            <span className="stat-widget-title">Verified Evidence Samples</span>
            <div className="stat-circle-icon amber">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="stat-number-row">
            <span className="stat-huge-number">{progressData?.totalAssessmentsSubmitted}</span>
            <span className="stat-unit-text">activities</span>
          </div>
          <span className="stat-footer-text">Quizzes & code executions</span>
        </div>
      </div>

      {/* Concept Breakdown Table */}
      <div className="studdy-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-light)' }}>
          <h2 style={{ fontSize: '16.5px', fontWeight: '700' }}>Concept-Level Mastery Breakdown</h2>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface-muted)', borderBottom: '1px solid var(--border-light)' }}>
                <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)' }}>Concept</th>
                <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)' }}>Module</th>
                <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)' }}>Estimated Mastery</th>
                <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)' }}>Status</th>
                <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)' }}>Evidence Count</th>
                <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)' }}>Practice</th>
              </tr>
            </thead>
            <tbody>
              {progressData?.conceptBreakdown?.map((item) => {
                const isLocked = item.status.includes('Locked');

                return (
                  <tr key={item.conceptId} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '16px 18px', fontWeight: '700', fontSize: '13.5px' }}>{item.name}</td>
                    <td style={{ padding: '16px 18px', fontSize: '13px', color: 'var(--text-muted)' }}>{item.module}</td>
                    <td style={{ padding: '16px 18px' }}>
                      {isLocked ? (
                        <span style={{ fontSize: '12.5px', color: 'var(--text-light)' }}>Insufficient evidence</span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '80px', height: '6px', background: 'var(--surface-muted)', borderRadius: '9999px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${item.mastery}%`,
                                height: '100%',
                                background: item.mastery >= 75 ? 'var(--success)' : item.mastery >= 50 ? 'var(--primary)' : 'var(--warning)',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: '800' }}>{item.mastery}%</span>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px 18px' }}>
                      <span className={`role-badge ${item.status === 'Mastered' ? 'student' : item.status === 'Developing' ? 'student' : 'teacher'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 18px', fontSize: '13px', color: 'var(--text-muted)' }}>
                      {item.evidenceCount > 0 ? `${item.evidenceCount} activities` : 'None yet'}
                    </td>
                    <td style={{ padding: '16px 18px' }}>
                      {isLocked ? (
                        <button type="button" className="btn-studdy btn-studdy-secondary" style={{ padding: '5px 10px', fontSize: '12px' }} disabled>
                          Locked
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-studdy btn-studdy-primary"
                          style={{ padding: '6px 14px', fontSize: '12px' }}
                          onClick={() => navigate('/content/quizzes')}
                        >
                          Practice Quiz
                        </button>
                      )}
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

export default ProgressPage;
