import React from 'react';
import { normalizeMastery } from '../../utils/mastery';

export function ProgressRing({
  value = 0,
  size = 72,
  strokeWidth = 5,
  color = 'var(--coral)',
  trackColor = 'var(--border-hairline)',
  showText = true,
  className = '',
}) {
  const normalized = normalizeMastery(value);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalized / 100) * circumference;

  return (
    <div
      className={`progress-ring-container ${className}`}
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
      role="progressbar"
      aria-valuenow={normalized}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress bar */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 400ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </svg>

      {showText && (
        <div
          style={{
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size <= 48 ? '11px' : size <= 72 ? '15px' : '18px',
            fontWeight: '600',
            color: 'var(--text-main)',
            letterSpacing: '-0.01em',
          }}
        >
          {normalized}%
        </div>
      )}
    </div>
  );
}

export default ProgressRing;
