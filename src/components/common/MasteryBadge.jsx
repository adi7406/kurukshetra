import React from 'react';
import { getMasteryLevel } from '../../utils/mastery';

export function MasteryBadge({ score, size = 'md', showLabel = true, className = '' }) {
  const meta = getMasteryLevel(score);

  const padding = size === 'sm' ? '2px 7px' : size === 'lg' ? '6px 14px' : '4px 10px';
  const fontSize = size === 'sm' ? '11px' : size === 'lg' ? '13px' : '12px';
  const dotSize = size === 'sm' ? '5px' : '6px';

  return (
    <span
      className={`mastery-badge ${meta.badgeClass} ${className}`}
      role="status"
      aria-label={meta.ariaLabel}
      title={`${meta.label} (${meta.score}%): ${meta.description}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding,
        borderRadius: '9999px',
        background: meta.bg,
        border: `1px solid ${meta.border}`,
        color: meta.textLight,
        fontSize,
        fontWeight: '600',
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          backgroundColor: meta.color,
          boxShadow: `0 0 6px ${meta.color}`,
          flexShrink: 0,
        }}
        aria-hidden="true"
      />
      <span>
        {meta.score}%{showLabel ? ` · ${meta.label}` : ''}
      </span>
    </span>
  );
}

export default MasteryBadge;
