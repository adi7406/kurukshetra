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
import MasteryBadge from '../components/common/MasteryBadge';
import { normalizeMastery, getMasteryLevel } from '../utils/mastery';

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span className="badge-clean blue" style={{ fontSize: '10.5px' }}>
            Learning Analytics
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
            Prerequisite readiness & mastery verification
          </span>
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          Student Learning Progress & Mastery Evidence
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
          Detailed prerequisite readiness tracked across verified quizzes, coding assessments, and viva explanations.
        </p>
      </div>

      {/* Policy Disclaimer Note */}
      <div
        className="saas-card"
        style={{
          background: 'var(--surface-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 18px',
        }}
      >
        <Info size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
          <strong style={{ color: 'var(--text-main)' }}>Assessment Policy:</strong> {progressData?.disclaimer}
        </span>
      </div>

      {/* 4 Stat Cards */}
      <div className="stat-widgets-grid">
        <div className="stat-widget-card">
          <div className="stat-widget-header">
            <span className="stat-widget-title">Overall Estimated Mastery</span>
            <div className="stat-circle-icon blue">
              <TrendingUp size={16} />
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
              <Award size={16} />
            </div>
          </div>
          <div className="stat-number-row">
            <span className="stat-huge-number">{progressData?.completedConceptsCount}</span>
            <span className="stat-unit-text">concepts</span>
          </div>
          <span className="stat-footer-text">Solid mastery (&gt;70%)</span>
        </div>

        <div className="stat-widget-card">
          <div className="stat-widget-header">
            <span className="stat-widget-title">Developing Concepts</span>
            <div className="stat-circle-icon cyan">
              <Layers size={16} />
            </div>
          </div>
          <div className="stat-number-row">
            <span className="stat-huge-number">{progressData?.developingConceptsCount}</span>
            <span className="stat-unit-text">in progress</span>
          </div>
          <span className="stat-footer-text">40% - 70% mastery range</span>
        </div>

        <div className="stat-widget-card">
          <div className="stat-widget-header">
            <span className="stat-widget-title">Verified Evidence Samples</span>
            <div className="stat-circle-icon amber">
              <CheckCircle2 size={16} />
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
      <div className="saas-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 0 }}>
        <div style={{ padding: '12px 18px', background: 'var(--surface-muted)', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
            Concept-Level Mastery Evidence Breakdown
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface-muted)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.04em' }}>Concept</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.04em' }}>Module</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.04em' }}>Estimated Mastery</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.04em' }}>Status</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.04em' }}>Evidence Count</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.04em', textAlign: 'right' }}>Practice</th>
              </tr>
            </thead>
            <tbody>
              {progressData?.conceptBreakdown?.map((item) => {
                const isLocked = item.status.includes('Locked');

                return (
                  <tr key={item.conceptId} style={{ borderBottom: '1px solid var(--border)' }} className="hover-row">
                    <td style={{ padding: '14px 16px', fontWeight: '600', fontSize: '13px', color: 'var(--text-main)' }}>{item.name}</td>
                    <td style={{ padding: '14px 16px', fontSize: '12.5px', color: 'var(--text-muted)' }}>{item.module}</td>
                    <td style={{ padding: '14px 16px' }}>
                      {isLocked ? (
                        <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>Insufficient evidence</span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <MasteryBadge score={item.mastery} size="sm" />
                          <span style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-main)' }}>
                            {normalizeMastery(item.mastery)}%
                          </span>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge-clean ${item.status === 'Mastered' ? 'green' : item.status === 'Developing' ? 'blue' : 'amber'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                      {item.evidenceCount > 0 ? `${item.evidenceCount} activities` : 'None yet'}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      {isLocked ? (
                        <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: '11.5px' }} disabled>
                          Locked
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ padding: '4px 12px', fontSize: '11.5px' }}
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
