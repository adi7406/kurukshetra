import React from 'react';
import { Inbox } from 'lucide-react';

export function EmptyState({
  title = 'No items found',
  description = 'There is currently no activity or content available for this section.',
  actionLabel,
  onAction,
  icon: Icon = Inbox,
}) {
  return (
    <div className="empty-state">
      <Icon className="empty-state-icon" aria-hidden="true" />
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-desc">{description}</p>
      {actionLabel && onAction && (
        <button type="button" className="btn btn-primary btn-sm" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
