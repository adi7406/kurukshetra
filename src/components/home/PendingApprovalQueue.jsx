import React, { useState } from 'react';
import { Check, Edit2, Clock, Layers, HelpCircle, Code2, AlertCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export function PendingApprovalQueue({ items = [], onApproveItem }) {
  const toast = useToast();
  const [queue, setQueue] = useState(
    items.length > 0
      ? items
      : [
          {
            id: 'appr_01',
            title: 'Hash Tables Collision Handling Diagnostic Quiz',
            type: 'Practice Quiz',
            module: 'Module 1: Linear & Key-Value Structures',
            questionsCount: 4,
            status: 'Pending Instructor Verification',
            date: 'Today at 10:15 AM',
          },
          {
            id: 'appr_02',
            title: 'LRU Cache Design (Doubly-Linked Sentinel)',
            type: 'Coding Challenge',
            module: 'Module 1: Linear & Key-Value Structures',
            constraints: 'O(1) get & put, 18 unit tests',
            status: 'Pending Instructor Verification',
            date: 'Today at 11:40 AM',
          },
          {
            id: 'appr_03',
            title: 'Self-Balancing AVL Trees Concept Definition',
            type: 'Concept DAG Node',
            module: 'Module 2: Hierarchical Tree & Graph Structures',
            status: 'Pending Instructor Verification',
            date: 'Yesterday',
          },
        ]
  );

  const handleApprove = (id, title) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
    toast.success(`Approved "${title}" · Published to active curriculum`);
    if (onApproveItem) onApproveItem(id);
  };

  if (queue.length === 0) {
    return (
      <div className="saas-card" style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{ color: '#34D399', fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}>
          ✓ No Pending Content Approvals
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          All synthesized curriculum concepts, practice quizzes, and coding challenges are verified and published.
        </p>
      </div>
    );
  }

  return (
    <div className="saas-card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: '700' }}>Curriculum Approval Queue</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '2px' }}>
            Extracted syllabus items requiring instructor sign-off before student publication
          </p>
        </div>
        <span className="badge-clean amber">
          {queue.length} Pending Approval
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {queue.map((item) => {
          const isQuiz = item.type.includes('Quiz');
          const isCode = item.type.includes('Coding');
          const Icon = isQuiz ? HelpCircle : isCode ? Code2 : Layers;

          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 14px',
                borderRadius: '8px',
                background: 'var(--surface-muted)',
                border: '1px solid var(--border)',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', minWidth: '240px', flex: 1 }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                    marginTop: '2px',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-main)' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-light)', marginTop: '2px' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>{item.type}</span> &bull; {item.module}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => handleApprove(item.id, item.title)}
                  style={{ padding: '6px 12px', fontSize: '12px', background: '#059669', borderColor: '#059669' }}
                >
                  <Check size={13} />
                  <span>Approve & Publish</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PendingApprovalQueue;
