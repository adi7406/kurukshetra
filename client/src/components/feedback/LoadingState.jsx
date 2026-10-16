import React from 'react';

export function LoadingState({ message = 'Loading workspace data...' }) {
  return (
    <div className="loading-container" role="status" aria-live="polite">
      <div className="spinner" />
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{message}</p>
    </div>
  );
}

export default LoadingState;
