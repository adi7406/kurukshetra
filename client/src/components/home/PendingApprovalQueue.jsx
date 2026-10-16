import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Edit2, Layers, HelpCircle, Code2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import RailCard from '../common/RailCard';

export function PendingApprovalQueue({ items = [], onApproveItem }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [queue, setQueue] = useState(items);

  React.useEffect(() => {
    setQueue(items);
  }, [items]);


  const handleApprove = (id, title) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
    toast.success(`Approved "${title}" · Published to active curriculum`);
    if (onApproveItem) onApproveItem(id);
  };

  const handleEdit = (title) => {
    toast.info(`Opening Syllabus Studio for "${title}"`);
    navigate('/teacher/content-upload');
  };

  return (
    <RailCard
      title="Pending Approvals"
      action={
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>
          {queue.length} pending
        </span>
      }
    >
      {queue.length === 0 ? (
        <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
          ✓ All syllabus items approved & published.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {queue.map((item) => {
            const isQuiz = item.type.includes('Quiz');
            const isCode = item.type.includes('Coding');
            const Icon = isQuiz ? HelpCircle : isCode ? Code2 : Layers;

            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  background: 'var(--surface-muted)',
                  border: '1px solid var(--border-hairline)',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                  <Icon size={15} strokeWidth={1.5} color="var(--coral)" style={{ flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: 'var(--text-main)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={item.title}
                    >
                      {item.title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px' }}>
                      {item.type}
                    </div>
                  </div>
                </div>

                {/* Approve & Edit Pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => handleEdit(item.title)}
                    className="btn-ghost-pill btn-compact"
                    style={{ height: '28px', padding: '0 8px', fontSize: '11px' }}
                    title="Edit item"
                  >
                    <Edit2 size={11} strokeWidth={1.5} />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(item.id, item.title)}
                    className="btn-coral-pill btn-compact"
                    style={{ height: '28px', padding: '0 10px', fontSize: '11px' }}
                    title="Approve item"
                  >
                    <Check size={11} strokeWidth={2} />
                    <span>Approve</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </RailCard>
  );
}

export default PendingApprovalQueue;
