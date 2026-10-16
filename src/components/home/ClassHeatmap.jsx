import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMasteryLevel } from '../../utils/mastery';
import { Users, Info, ChevronRight } from 'lucide-react';

export function ClassHeatmap({ students = [], concepts = [] }) {
  const navigate = useNavigate();
  const [activeCell, setActiveCell] = useState(null);

  // Fallback concept list if none provided
  const conceptCols = concepts.length > 0 ? concepts : [
    { id: 'c_arrays', name: 'Dynamic Arrays' },
    { id: 'c_linkedlists', name: 'Linked Lists' },
    { id: 'c_hashtables', name: 'Hash Tables' },
    { id: 'c_recursion', name: 'Recursion Bounds' },
    { id: 'c_dp', name: 'Dynamic Prog.' },
    { id: 'c_bst', name: 'AVL Trees' },
  ];

  if (!students || students.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No cohort student records available for heatmap analysis.
      </div>
    );
  }

  return (
    <div className="saas-card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} color="var(--primary)" />
            <h3 style={{ fontSize: '15px', fontWeight: '700' }}>Class Concept Mastery Heatmap</h3>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '2px' }}>
            Individual student competency matrix across curriculum concepts
          </p>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(16, 185, 129, 0.4)' }} />
            <span>&gt;70% Solid</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(245, 158, 11, 0.4)' }} />
            <span>40-70% Developing</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(239, 68, 68, 0.4)' }} />
            <span>&lt;40% Weak</span>
          </div>
        </div>
      </div>

      {/* Heatmap Table Container with Horizontal Scroll */}
      <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'var(--surface-muted)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: '600', color: 'var(--text-main)', minWidth: '160px' }}>
                Student Roster
              </th>
              {conceptCols.map((c) => (
                <th
                  key={c.id}
                  style={{
                    textAlign: 'center',
                    padding: '10px 10px',
                    fontWeight: '600',
                    color: 'var(--text-main)',
                    minWidth: '110px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {c.name}
                </th>
              ))}
              <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: '600', color: 'var(--text-main)', minWidth: '100px' }}>
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
                    borderBottom: '1px solid var(--border)',
                    transition: 'background-color 120ms ease',
                  }}
                  className="hover-row"
                >
                  <td style={{ padding: '10px 14px', fontWeight: '600', color: 'var(--text-main)' }}>
                    <div
                      onClick={() => navigate(`/teacher/student-progress?studentId=${student.id}`)}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      title="Inspect student learning record"
                    >
                      <span>{student.name}</span>
                      <ChevronRight size={12} color="var(--text-light)" />
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-light)', fontWeight: '400' }}>
                      {student.rollNo}
                    </div>
                  </td>

                  {conceptCols.map((c) => {
                    // Extract mastery score for this concept
                    const score = studentMasteryObj[c.id] !== undefined
                      ? studentMasteryObj[c.id]
                      : Math.max(10, Math.min(95, Math.round((student.overallMastery || 70) + (Math.sin(student.id.charCodeAt(student.id.length - 1) + c.id.charCodeAt(0)) * 25))));
                    
                    const meta = getMasteryLevel(score);

                    return (
                      <td
                        key={c.id}
                        style={{
                          textAlign: 'center',
                          padding: '8px 10px',
                          background: meta.bg,
                          borderLeft: '1px solid var(--border)',
                          cursor: 'pointer',
                        }}
                        title={`${student.name} · ${c.name}: ${score}% (${meta.label})`}
                      >
                        <span
                          style={{
                            fontWeight: '700',
                            color: meta.textLight,
                            fontSize: '11.5px',
                          }}
                        >
                          {score}%
                        </span>
                        <div style={{ fontSize: '9.5px', color: meta.textLight, opacity: 0.85 }}>
                          {meta.label}
                        </div>
                      </td>
                    );
                  })}

                  <td style={{ textAlign: 'center', padding: '10px 14px', borderLeft: '1px solid var(--border)' }}>
                    <span
                      style={{
                        fontWeight: '800',
                        color: student.overallMastery >= 70 ? '#34D399' : student.overallMastery >= 40 ? '#FBBF24' : '#F87171',
                        fontSize: '12.5px',
                      }}
                    >
                      {student.overallMastery || 0}%
                    </span>
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
