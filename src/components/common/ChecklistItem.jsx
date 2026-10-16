import React from 'react';
import { Check, Flame, Circle } from 'lucide-react';

export function ChecklistItem({
  title,
  duration,
  points,
  completed = false,
  actionLabel,
  onAction,
  onToggle,
  className = '',
}) {
  return (
    <div
      className={`checklist-item-row ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px',
        borderRadius: '12px',
        background: 'var(--surface-muted)',
        border: '1px solid var(--border-hairline)',
        gap: '10px',
        transition: 'all 140ms ease',
      }}
    >
      {/* Left: Checkmark Circle + Details */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
        <button
          type="button"
          onClick={onToggle}
          aria-label={completed ? `Mark ${title} incomplete` : `Mark ${title} complete`}
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            border: completed ? 'none' : '1.5px solid var(--border-hairline)',
            background: completed ? 'var(--coral)' : 'var(--surface)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: onToggle ? 'pointer' : 'default',
            flexShrink: 0,
            padding: 0,
            transition: 'all 140ms ease',
          }}
        >
          {completed && <Check size={12} strokeWidth={2.5} />}
        </button>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: '13px',
              fontWeight: '500',
              color: completed ? 'var(--text-secondary)' : 'var(--text-main)',
              textDecoration: completed ? 'line-through' : 'none',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={title}
          >
            {title}
          </div>
          {duration && (
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px' }}>
              {duration}
            </div>
          )}
        </div>
      </div>

      {/* Right: Points flame & Pill action button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {points !== undefined && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              fontSize: '11px',
              fontWeight: '600',
              color: 'var(--coral)',
            }}
          >
            <Flame size={12} strokeWidth={1.5} />
            <span>+{points}</span>
          </div>
        )}

        {actionLabel && onAction && (
          <button
            type="button"
            className="btn-pill-compact"
            onClick={onAction}
            style={{
              padding: '4px 12px',
              borderRadius: 'var(--radius-pill)',
              fontSize: '11.5px',
              fontWeight: '500',
              background: 'var(--surface)',
              border: '1px solid var(--border-hairline)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              transition: 'all 140ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--coral)';
              e.currentTarget.style.color = 'var(--coral)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-hairline)';
              e.currentTarget.style.color = 'var(--text-main)';
            }}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default ChecklistItem;
