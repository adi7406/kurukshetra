import React from 'react';

export function PillTabs({ tabs = [], activeTab, onChange, className = '' }) {
  return (
    <div
      className={`pill-tabs-bar ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        overflowX: 'auto',
        padding: '2px 0',
      }}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)', // fully rounded
              fontSize: '13px',
              fontWeight: '500',
              border: isActive ? '1px solid var(--coral)' : '1px solid var(--border-hairline)',
              background: isActive ? 'var(--coral)' : 'var(--surface)',
              color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 140ms ease',
            }}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-pill)',
                  background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'var(--surface-muted)',
                  color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default PillTabs;
