import React from 'react';
import { getMasteryLevel } from '../../utils/mastery';

export function MasteryChip({ score, size = 'md', className = '', style = {} }) {
  const meta = getMasteryLevel(score);

  return (
    <span
      className={`mastery-chip ${meta.badgeClass} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: size === 'sm' ? '2px 8px' : '3px 10px',
        borderRadius: 'var(--radius-pill)',
        fontSize: size === 'sm' ? '11px' : '12px',
        fontWeight: '500',
        lineHeight: '1.3',
        background: meta.bgLight || meta.bg,
        color: meta.color,
        border: `1px solid ${meta.borderLight || meta.border}`,
        ...style,
      }}
      role="status"
      aria-label={meta.ariaLabel}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: meta.color,
          flexShrink: 0,
        }}
        aria-hidden="true"
      />
      <span>
        {meta.score}% · {meta.label}
      </span>
    </span>
  );
}

export default MasteryChip;
