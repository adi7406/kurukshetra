import React from 'react';

export function RailCard({
  title,
  action,
  children,
  className = '',
  style = {},
}) {
  return (
    <div
      className={`rail-card ${className}`}
      style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius-card)', // 20px
        border: '1px solid var(--border-hairline)',
        boxShadow: 'var(--shadow-card)',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        ...style,
      }}
    >
      {(title || action) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '10px',
            borderBottom: '1px solid var(--border-hairline)',
          }}
        >
          {title && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: '600',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {title}
            </span>
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export default RailCard;
