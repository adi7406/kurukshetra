import React from 'react';
import { Inbox } from 'lucide-react';

export function EmptyState({
  title = 'No items found',
  description = 'There is currently no activity or content available for this section.',
  actionLabel,
  actionText,
  onAction,
  icon: Icon = Inbox,
}) {
  const label = actionLabel || actionText;

  return (
    <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px 16px' }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--coral-soft)', color: 'var(--coral)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
        <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
      </div>
      <h3 className="empty-state-title" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
        {title}
      </h3>
      <p className="empty-state-desc" style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '420px', lineHeight: 1.5, margin: '0 0 16px 0' }}>
        {description}
      </p>
      {label && onAction && (
        <button
          type="button"
          className="btn-coral-pill btn-compact"
          onClick={onAction}
          style={{ marginTop: '4px' }}
        >
          {label}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
