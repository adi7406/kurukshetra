import React from 'react';

export function Chip({
  children,
  variant = 'default', // 'default' | 'coral' | 'weak' | 'developing' | 'solid' | 'dark'
  size = 'md', // 'sm' | 'md'
  icon: Icon,
  className = '',
  style = {},
}) {
  const variantStyles = {
    default: {
      background: 'var(--surface-muted)',
      color: 'var(--text-secondary)',
      border: '1px solid var(--border-hairline)',
    },
    coral: {
      background: 'var(--coral-soft)',
      color: 'var(--coral)',
      border: '1px solid var(--coral-border)',
    },
    weak: {
      background: 'var(--mastery-weak-soft)',
      color: 'var(--mastery-weak)',
      border: '1px solid rgba(229, 72, 77, 0.25)',
    },
    developing: {
      background: 'var(--mastery-developing-soft)',
      color: 'var(--mastery-developing)',
      border: '1px solid rgba(245, 165, 36, 0.25)',
    },
    solid: {
      background: 'var(--mastery-solid-soft)',
      color: 'var(--mastery-solid)',
      border: '1px solid rgba(23, 166, 115, 0.25)',
    },
    dark: {
      background: 'var(--dark-pill)',
      color: '#FFFFFF',
      border: 'none',
    },
  };

  const currentVariant = variantStyles[variant] || variantStyles.default;

  return (
    <span
      className={`chip-pill ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: size === 'sm' ? '2px 8px' : '3px 10px',
        borderRadius: 'var(--radius-pill)',
        fontSize: size === 'sm' ? '11px' : '12px',
        fontWeight: '500',
        lineHeight: '1.3',
        ...currentVariant,
        ...style,
      }}
    >
      {Icon && <Icon size={size === 'sm' ? 11 : 12} strokeWidth={1.5} />}
      <span>{children}</span>
    </span>
  );
}

export default Chip;
