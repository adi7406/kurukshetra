import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Award,
  AlertCircle,
  HelpCircle,
  Info,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { learningService } from '../services/learningService';
import LoadingState from '../components/feedback/LoadingState';
import EmptyState from '../components/feedback/EmptyState';
import StatCard from '../components/common/StatCard';
import ProgressRing from '../components/common/ProgressRing';
import MasteryChip from '../components/common/MasteryChip';
import Chip from '../components/common/Chip';
import { normalizeMastery } from '../utils/mastery';

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

  const overallScore = normalizeMastery(progressData?.overallEstimatedMastery ?? 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Breadcrumb & Title */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/home')}>Home</span>
          <span>/</span>
          <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>Mastery & Progress</span>
        </div>
        <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em' }}>
          Learning Analytics & Evidence
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '-0.01em', margin: '4px 0 0 0' }}>
          Student Learning Progress & Mastery Evidence
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
          Detailed prerequisite readiness tracked across verified quizzes, coding assessments, and viva explanations.
        </p>
      </div>

      {/* Policy Disclaimer Note */}
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: '16px',
          border: '1px solid var(--border-hairline)',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 18px',
        }}
      >
        <Info size={16} strokeWidth={1.5} color="var(--coral)" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          <strong style={{ color: 'var(--text-main)' }}>Assessment Policy:</strong> {progressData?.disclaimer || 'Mastery scores reflect Bayesian Knowledge Tracing across diagnostic attempts and are updated continuously.'}
        </span>
      </div>

      {/* 4 Stat Cards */}
      <div className="stat-cards-grid">
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
            Overall Estimated Mastery
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '8px 0' }}>
            <div style={{ fontSize: '28px', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
              {overallScore}%
            </div>
            <ProgressRing progress={overallScore} size={46} strokeWidth={4} color="var(--coral)" />
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Calculated via BKT update model
          </div>
        </div>

        <StatCard
          label="Mastered Concepts"
          value={progressData?.completedConceptsCount ?? 0}
          caption="Solid mastery (>70%)"
        />

        <StatCard
          label="Developing Concepts"
          value={progressData?.developingConceptsCount ?? 0}
          caption="In progress (40% - 70%)"
        />

        <StatCard
          label="Verified Evidence"
          value={progressData?.totalAssessmentsSubmitted ?? 0}
          caption="Quizzes & code executions"
        />
      </div>

      {/* Concept Breakdown Table */}
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
              Concept Matrix
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', margin: '2px 0 0 0' }}>
              Concept-Level Mastery Evidence Breakdown
            </h3>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {progressData?.conceptBreakdown?.length || 0} trackable competencies
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--surface-muted)', borderBottom: '1px solid var(--border-hairline)' }}>
                <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>Concept</th>
                <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>Module</th>
                <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>Estimated Mastery</th>
                <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>Status</th>
                <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>Evidence</th>
                <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {(!progressData?.conceptBreakdown || progressData.conceptBreakdown.length === 0) ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px 20px', textAlign: 'center' }}>
                    <EmptyState
                      icon={TrendingUp}
                      title="No Learning Evidence Recorded Yet"
                      description="Complete quizzes or coding assessments to see Bayesian Knowledge Tracing scores and concept breakdown."
                      actionText="Browse Assessments"
                      onAction={() => navigate('/content/coding')}
                    />
                  </td>
                </tr>
              ) : (
                progressData.conceptBreakdown.map((item) => {
                  const isLocked = item.status?.includes('Locked');
                  const score = normalizeMastery(item.mastery || 0);

                  return (
                    <tr key={item.conceptId} style={{ borderBottom: '1px solid var(--border-hairline)' }} className="hover-row">
                      <td style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-main)' }}>
                        {item.name}
                      </td>
                      <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                        {item.module || 'Module 1: Foundations'}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        {isLocked ? (
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Insufficient evidence</span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '64px', height: '5px', background: 'var(--surface-muted)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${score}%`,
                                  height: '100%',
                                  background: score >= 70 ? 'var(--mastery-solid)' : score >= 40 ? 'var(--mastery-developing)' : 'var(--mastery-weak)',
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)' }}>{score}%</span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <MasteryChip score={score} size="sm" />
                      </td>
                      <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                        {item.evidenceCount > 0 ? `${item.evidenceCount} activities` : 'None yet'}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        {isLocked ? (
                          <button type="button" className="btn-ghost-pill btn-compact" style={{ opacity: 0.5 }} disabled>
                            Locked
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-coral-pill btn-compact"
                            onClick={() => navigate('/content/quizzes')}
                          >
                            <span>Practice</span>
                            <ArrowRight size={13} strokeWidth={1.5} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ProgressPage;
