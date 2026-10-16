import React from 'react';

export function Card({
  children,
  label,
  headerAction,
  className = '',
  style = {},
  onClick,
  ...props
}) {
  return (
    <div
      className={`ref-card ${onClick ? 'clickable' : ''} ${className}`}
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius-card)', // 20px
        border: '1px solid var(--border-hairline)',
        boxShadow: 'var(--shadow-card)',
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        ...style,
      }}
      {...props}
    >
      {(label || headerAction) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}
        >
          {label && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: '600',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {label}
            </span>
          )}
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export default Card;
