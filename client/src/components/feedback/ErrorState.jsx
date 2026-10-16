import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export function ErrorState({
  title = 'Unable to complete request',
  message = 'An unexpected error occurred while communicating with the server. Please try again.',
  onRetry,
}) {
  return (
    <div className="error-state" role="alert">
      <AlertCircle style={{ width: '20px', height: '20px', flexShrink: 0, marginTop: '2px' }} />
      <div className="error-state-text" style={{ flex: 1 }}>
        <h4>{title}</h4>
        <p>{message}</p>
        {onRetry && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onRetry}
            style={{ marginTop: '10px' }}
          >
            <RefreshCw style={{ width: '14px', height: '14px' }} />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

export default ErrorState;
