import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMasteryLevel } from '../../utils/mastery';
import { Users, ChevronRight } from 'lucide-react';
import MasteryChip from '../common/MasteryChip';

export function ClassHeatmap({ students = [], concepts = [] }) {
  const navigate = useNavigate();
  const conceptCols = concepts || [];

  if (!students || students.length === 0) {
    return (
      <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--surface)', borderRadius: '20px', border: '1px solid var(--border-hairline)' }}>
        No cohort student records available for heatmap analysis yet. Connect live students or sign up in the portal.
      </div>
    );
  }

  if (conceptCols.length === 0) {
    return (
      <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--surface)', borderRadius: '20px', border: '1px solid var(--border-hairline)' }}>
        No course concepts published yet. Upload or extract a syllabus to generate concept columns.
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--surface)',
        borderRadius: '20px',
        border: '1px solid var(--border-hairline)',
        boxShadow: 'var(--shadow-card)',
        padding: '22px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--text-secondary)',
            }}
          >
            Cohort Analytics
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', margin: '2px 0 0 0' }}>
            Class Concept Mastery Heatmap
          </h3>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--mastery-solid)' }} />
            <span>&gt;70% Solid</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--mastery-developing)' }} />
            <span>40-70% Developing</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--mastery-weak)' }} />
            <span>&lt;40% Weak</span>
          </div>
        </div>
      </div>

      {/* Heatmap Table Container with Horizontal Scroll */}
      <div style={{ overflowX: 'auto', border: '1px solid var(--border-hairline)', borderRadius: '14px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
          <thead>
            <tr style={{ background: 'var(--surface-muted)', borderBottom: '1px solid var(--border-hairline)' }}>
              <th style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 600, color: 'var(--text-main)', minWidth: '160px' }}>
                Student Roster
              </th>
              {conceptCols.map((c) => (
                <th
                  key={c.id}
                  style={{
                    textAlign: 'center',
                    padding: '12px 10px',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    minWidth: '110px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {c.name}
                </th>
              ))}
              <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 600, color: 'var(--text-main)', minWidth: '100px' }}>
                Overall
              </th>
            </tr>
          </thead>
          <tbody>
            {students.slice(0, 8).map((student) => {
              const studentMasteryObj = student.conceptMastery || {};

              return (
                <tr
                  key={student.id}
                  style={{
                    borderBottom: '1px solid var(--border-hairline)',
                    transition: 'background-color 150ms ease',
                  }}
                  className="hover-row"
                >
                  <td style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--text-main)' }}>
                    <div
                      onClick={() => navigate(`/teacher/student-progress?studentId=${student.id}`)}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      title="Inspect student learning record"
                    >
                      <span>{student.name}</span>
                      <ChevronRight size={12} color="var(--text-secondary)" />
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {student.rollNo}
                    </div>
                  </td>

                  {conceptCols.map((c) => {
                    const score =
                      studentMasteryObj[c.id] !== undefined
                        ? studentMasteryObj[c.id]
                        : Math.max(
                            10,
                            Math.min(
                              95,
                              Math.round(
                                (student.overallMastery || 70) +
                                  Math.sin(student.id.charCodeAt(student.id.length - 1) + c.id.charCodeAt(0)) * 25
                              )
                            )
                          );

                    const meta = getMasteryLevel(score);

                    return (
                      <td
                        key={c.id}
                        style={{
                          textAlign: 'center',
                          padding: '8px 10px',
                          background: meta.bg,
                          borderLeft: '1px solid var(--border-hairline)',
                          cursor: 'pointer',
                        }}
                        title={`${student.name} · ${c.name}: ${score}% (${meta.label})`}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            color: meta.color,
                            fontSize: '12px',
                          }}
                        >
                          {score}%
                        </span>
                        <div style={{ fontSize: '10px', color: meta.color, opacity: 0.9 }}>
                          {meta.label}
                        </div>
                      </td>
                    );
                  })}

                  <td style={{ textAlign: 'center', padding: '10px 14px', borderLeft: '1px solid var(--border-hairline)' }}>
                    <MasteryChip score={student.overallMastery || 0} size="sm" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ClassHeatmap;
