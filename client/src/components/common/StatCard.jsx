import React from 'react';

export function StatCard({
  label,
  value,
  unit,
  caption,
  icon: Icon,
  customVisual,
  style = {},
  className = '',
  onClick,
}) {
  return (
    <div
      className={`stat-card ${onClick ? 'clickable' : ''} ${className}`}
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius-card)', // 20px
        border: '1px solid var(--border-hairline)',
        boxShadow: 'var(--shadow-card)',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '118px',
        position: 'relative',
        transition: 'transform 160ms ease, box-shadow 160ms ease',
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
        {Icon && (
          <Icon
            size={16}
            color="var(--text-secondary)"
            strokeWidth={1.5}
            style={{ flexShrink: 0 }}
          />
        )}
      </div>

      {customVisual ? (
        <div style={{ margin: '8px 0', display: 'flex', alignItems: 'center' }}>
          {customVisual}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0' }}>
          <span
            style={{
              fontSize: '28px',
              fontWeight: '600',
              color: 'var(--text-main)',
              lineHeight: '1.2',
              letterSpacing: '-0.01em',
            }}
          >
            {value}
          </span>
          {unit && (
            <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>
              {unit}
            </span>
          )}
        </div>
      )}

      {caption && (
        <div
          style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            lineHeight: '1.35',
            marginTop: '2px',
          }}
        >
          {caption}
        </div>
      )}
    </div>
  );
}

export default StatCard;
