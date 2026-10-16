import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { getMasteryLevel } from '../../utils/mastery';

export function MasteryRing({ score = 0, size = 110, strokeWidth = 8, showDetails = true }) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const meta = getMasteryLevel(score);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.min(100, Math.max(0, meta.score));
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
          role="img"
          aria-label={meta.ariaLabel}
        >
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="var(--surface-muted)"
            strokeWidth={strokeWidth}
          />
          {/* Animated progress ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={meta.color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 650ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </svg>

        {/* Center content */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontSize: size > 90 ? '22px' : '17px',
              fontWeight: '800',
              color: 'var(--text-main)',
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            {clampedScore}%
          </div>
          <div
            style={{
              fontSize: size > 90 ? '11px' : '10px',
              fontWeight: '700',
              color: meta.textLight,
              marginTop: '3px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {meta.label}
          </div>
        </div>
      </div>

      {showDetails && (
        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>
            Concept Mastery
          </span>
          <button
            type="button"
            onClick={() => setTooltipOpen((prev) => !prev)}
            onMouseEnter={() => setTooltipOpen(true)}
            onMouseLeave={() => setTooltipOpen(false)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-light)',
              display: 'inline-flex',
              padding: '2px',
            }}
            aria-label="What does concept mastery represent?"
          >
            <HelpCircle size={13} />
          </button>

          {/* Accessible Tooltip */}
          {tooltipOpen && (
            <div
              style={{
                position: 'absolute',
                top: size + 28,
                zIndex: 50,
                width: '240px',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--dialog-shadow)',
                fontSize: '11.5px',
                lineHeight: '1.45',
                color: 'var(--text-main)',
                textAlign: 'left',
              }}
            >
              <strong>What is Concept Mastery?</strong>
              <p style={{ marginTop: '4px', color: 'var(--text-muted)' }}>
                Your probabilistic understanding computed from diagnostic quiz accuracy, isolated code execution, and prerequisite mastery depth.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MasteryRing;
