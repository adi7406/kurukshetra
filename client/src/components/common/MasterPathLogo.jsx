import React from 'react';

export function MasterPathLogo({
  variant = 'full', // 'full' | 'icon' | 'badge'
  height = 36,
  className = '',
  style = {},
}) {
  if (variant === 'icon') {
    return (
      <svg
        viewBox="0 0 200 160"
        height={height}
        className={className}
        style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="mp_icon_brand" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="50%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
          <filter id="mp_icon_glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <rect width="100%" height="100%" rx="32" fill="#0B1121" />
        <g transform="translate(10, 15)">
          <path
            d="M20,120 L20,45 L65,90 L110,45 L110,120"
            stroke="#1E293B"
            strokeWidth="18"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M110,45 L150,45 C165,45 175,55 175,70 C175,85 165,95 150,95 L110,95"
            stroke="#1E293B"
            strokeWidth="18"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M5,100 L40,65 L70,95 L120,45 L160,20"
            stroke="url(#mp_icon_brand)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            filter="url(#mp_icon_glow)"
          />
          <path
            d="M5,100 L40,65 L70,95 L120,45 L160,20"
            stroke="url(#mp_icon_brand)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M135,20 L160,20 L160,45"
            stroke="url(#mp_icon_brand)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <circle cx="5" cy="100" r="7" fill="#06B6D4" />
          <circle cx="40" cy="65" r="7" fill="#0EA5E9" />
          <circle cx="70" cy="95" r="7" fill="#3B82F6" />
          <circle cx="120" cy="45" r="7" fill="#8B5CF6" />
        </g>
      </svg>
    );
  }

  // Full Logo with adaptive Typography
  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '12px',
        userSelect: 'none',
        ...style,
      }}
    >
      <svg
        viewBox="0 0 200 160"
        height={height}
        style={{ flexShrink: 0 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="mp_brand" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="50%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
          <filter id="mp_glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <rect width="100%" height="100%" rx="32" fill="#0B1121" />
        <g transform="translate(10, 15)">
          <path
            d="M20,120 L20,45 L65,90 L110,45 L110,120"
            stroke="#1E293B"
            strokeWidth="18"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M110,45 L150,45 C165,45 175,55 175,70 C175,85 165,95 150,95 L110,95"
            stroke="#1E293B"
            strokeWidth="18"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M5,100 L40,65 L70,95 L120,45 L160,20"
            stroke="url(#mp_brand)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            filter="url(#mp_glow)"
          />
          <path
            d="M5,100 L40,65 L70,95 L120,45 L160,20"
            stroke="url(#mp_brand)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M135,20 L160,20 L160,45"
            stroke="url(#mp_brand)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <circle cx="5" cy="100" r="7" fill="#06B6D4" />
          <circle cx="40" cy="65" r="7" fill="#0EA5E9" />
          <circle cx="70" cy="95" r="7" fill="#3B82F6" />
          <circle cx="120" cy="45" r="7" fill="#8B5CF6" />
        </g>
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
          <span style={{ fontSize: `${Math.round(height * 0.56)}px`, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.03em', lineHeight: 1 }}>
            Master
          </span>
          <span
            style={{
              fontSize: `${Math.round(height * 0.56)}px`,
              fontWeight: 800,
              background: 'linear-gradient(135deg, #06B6D4 0%, #6366F1 50%, #A855F7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.03em',
              lineHeight: 1,
            }}
          >
            Path
          </span>
        </div>
        <span
          style={{
            fontSize: `${Math.max(9, Math.round(height * 0.22))}px`,
            fontWeight: 700,
            color: '#94A3B8',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginTop: '3px',
            lineHeight: 1,
          }}
        >
          Adaptive Learning
        </span>
      </div>
    </div>
  );
}

export default MasterPathLogo;
