import React from 'react';
import { ResponsiveContainer, LineChart, Line, Tooltip } from 'recharts';

export function Sparkline({ data = [], color = '#3B82F6', width = 90, height = 32 }) {
  if (!data || data.length < 2) {
    return (
      <span style={{ fontSize: '11px', color: 'var(--text-light)', fontStyle: 'italic' }}>
        No historical data
      </span>
    );
  }

  // Format data array if array of numbers
  const chartData = data.map((val, idx) =>
    typeof val === 'number' ? { index: idx, value: val } : val
  );

  return (
    <div style={{ width, height, display: 'inline-block', verticalAlign: 'middle' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10.5px',
                      color: 'var(--text-main)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                    }}
                  >
                    {payload[0].value}%
                  </div>
                );
              }
              return null;
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default Sparkline;
