import React from 'react';
import { Layers, ArrowRight, ArrowDown, Database, Cpu } from 'lucide-react';

/**
 * ConceptDiagram Component
 * Renders visual, interactive diagrams for data structures and concepts:
 * - Arrays: Contiguous memory buffer with indices, byte addresses, and capacity
 * - Strings: Character sequence buffer with sliding window slice pointers
 * - Stack: Vertical LIFO container with Top pointer, push/pop vectors, and call frames
 */
export function ConceptDiagram({ conceptType = 'array', title, conceptName = '' }) {
  const normalized = (conceptName || conceptType || '').toLowerCase();

  if (normalized.includes('string')) {
    return (
      <div
        style={{
          background: 'var(--surface-muted)',
          border: '1px solid var(--border-hairline)',
          borderRadius: '16px',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em' }}>
            Data Structure Diagram &bull; Immutable Character Buffer
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            Encoding: UTF-8 / ASCII
          </span>
        </div>

        {/* Visual String Diagram */}
        <div style={{ overflowX: 'auto', padding: '10px 0' }}>
          <div style={{ display: 'flex', gap: '6px', minWidth: '320px', alignItems: 'flex-end' }}>
            {[
              { char: "'P'", idx: 0, addr: '0x10', inWindow: false },
              { char: "'A'", idx: 1, addr: '0x11', inWindow: true, label: 'L' },
              { char: "'T'", idx: 2, addr: '0x12', inWindow: true },
              { char: "'H'", idx: 3, addr: '0x13', inWindow: true, label: 'R' },
              { char: "'W'", idx: 4, addr: '0x14', inWindow: false },
              { char: "'\\0'", idx: 5, addr: '0x15', inWindow: false, isNull: true },
            ].map((slot, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                {slot.label && (
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      color: 'var(--coral)',
                      background: 'var(--coral-soft)',
                      padding: '1px 6px',
                      borderRadius: 'var(--radius-pill)',
                    }}
                  >
                    {slot.label} (ptr)
                  </span>
                )}
                {!slot.label && <div style={{ height: '18px' }} />}

                <div
                  style={{
                    width: '100%',
                    minWidth: '46px',
                    height: '46px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: slot.inWindow ? 'var(--coral-soft)' : slot.isNull ? 'var(--surface-subtle)' : '#FFFFFF',
                    border: slot.inWindow ? '2px solid var(--coral)' : '1px solid var(--border-hairline)',
                    borderRadius: '10px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: slot.inWindow ? 'var(--coral)' : slot.isNull ? 'var(--text-light)' : 'var(--text-main)',
                    boxShadow: slot.inWindow ? '0 2px 8px rgba(255, 91, 55, 0.15)' : 'none',
                    transition: 'all 150ms ease',
                  }}
                >
                  {slot.char}
                </div>

                <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  [{slot.idx}]
                </div>
                <div style={{ fontSize: '9.5px', color: 'var(--text-light)', fontFamily: 'var(--font-mono)' }}>
                  {slot.addr}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '11.5px', color: 'var(--text-secondary)', paddingTop: '8px', borderTop: '1px solid var(--border-hairline)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', background: 'var(--coral-soft)', border: '1.5px solid var(--coral)', borderRadius: '3px' }} />
            Active Substring Window [L...R]
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', background: 'var(--surface-subtle)', border: '1px solid var(--border-hairline)', borderRadius: '3px' }} />
            Null Sentinel (\0)
          </span>
          <span style={{ marginLeft: 'auto', color: 'var(--text-light)' }}>
            O(1) Random Byte Access
          </span>
        </div>
      </div>
    );
  }

  if (normalized.includes('stack')) {
    return (
      <div
        style={{
          background: 'var(--surface-muted)',
          border: '1px solid var(--border-hairline)',
          borderRadius: '16px',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em' }}>
            Data Structure Diagram &bull; LIFO Execution Container
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            Discipline: Last-In, First-Out
          </span>
        </div>

        {/* Visual Stack Diagram */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', padding: '12px 0' }}>
          {/* Operations Vector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end', fontSize: '11px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--mastery-solid)', fontWeight: 600 }}>
              <span>push(element)</span>
              <ArrowRight size={14} strokeWidth={2} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--coral)', fontWeight: 600 }}>
              <span>pop() &rarr; top</span>
              <ArrowRight size={14} strokeWidth={2} style={{ transform: 'rotate(180deg)' }} />
            </div>
          </div>

          {/* Vertical Stack Chamber */}
          <div
            style={{
              width: '180px',
              borderLeft: '2px solid var(--text-secondary)',
              borderRight: '2px solid var(--text-secondary)',
              borderBottom: '3px solid var(--text-main)',
              borderRadius: '0 0 8px 8px',
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              background: '#FFFFFF',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                background: 'var(--coral-soft)',
                border: '1.5px solid var(--coral)',
                color: 'var(--coral)',
                fontWeight: 700,
                fontSize: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>Frame 3: value=42</span>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>&larr; TOP</span>
            </div>
            <div
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                background: 'var(--surface-muted)',
                border: '1px solid var(--border-hairline)',
                color: 'var(--text-main)',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              Frame 2: value=18
            </div>
            <div
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                background: 'var(--surface-muted)',
                border: '1px solid var(--border-hairline)',
                color: 'var(--text-main)',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              Frame 1: value=7 (Base)
            </div>
          </div>

          {/* Characteristics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <div>&bull; <strong>Top:</strong> O(1) peek</div>
            <div>&bull; <strong>Push:</strong> O(1) prepend</div>
            <div>&bull; <strong>Pop:</strong> O(1) removal</div>
            <div>&bull; <strong>Aux Space:</strong> O(N)</div>
          </div>
        </div>

        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', paddingTop: '8px', borderTop: '1px solid var(--border-hairline)', display: 'flex', justifyContent: 'space-between' }}>
          <span>Monotonic & Bracket Invariant Verification</span>
          <span style={{ color: 'var(--coral)', fontWeight: 600 }}>Active Stack Pointer SP: 0x7FFF</span>
        </div>
      </div>
    );
  }

  // Default: Array Diagram
  return (
    <div
      style={{
        background: 'var(--surface-muted)',
        border: '1px solid var(--border-hairline)',
        borderRadius: '16px',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em' }}>
          Data Structure Diagram &bull; Contiguous Indexed Memory Array
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          Base Address: 0x2000 (sizeof=4 bytes)
        </span>
      </div>

      {/* Visual Array Diagram */}
      <div style={{ overflowX: 'auto', padding: '10px 0' }}>
        <div style={{ display: 'flex', gap: '6px', minWidth: '340px' }}>
          {[
            { val: 12, idx: 0, addr: '0x2000', state: 'occupied' },
            { val: 24, idx: 1, addr: '0x2004', state: 'occupied' },
            { val: 36, idx: 2, addr: '0x2008', state: 'occupied' },
            { val: 48, idx: 3, addr: '0x200C', state: 'occupied' },
            { val: '--', idx: 4, addr: '0x2010', state: 'free' },
            { val: '--', idx: 5, addr: '0x2014', state: 'free' },
          ].map((slot, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
              <div
                style={{
                  width: '100%',
                  minWidth: '48px',
                  height: '46px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: slot.state === 'occupied' ? '#FFFFFF' : 'var(--surface-subtle)',
                  border: slot.state === 'occupied' ? '1.5px solid var(--border-hairline)' : '1px dashed var(--border-hairline)',
                  borderRadius: '10px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '14px',
                  fontWeight: slot.state === 'occupied' ? 700 : 400,
                  color: slot.state === 'occupied' ? 'var(--text-main)' : 'var(--text-light)',
                  boxShadow: slot.state === 'occupied' ? 'var(--shadow-sm)' : 'none',
                }}
              >
                {slot.val}
              </div>

              <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                idx: [{slot.idx}]
              </div>
              <div style={{ fontSize: '9.5px', color: 'var(--text-light)', fontFamily: 'var(--font-mono)' }}>
                {slot.addr}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Formula & Metrics */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '11.5px', color: 'var(--text-secondary)', paddingTop: '8px', borderTop: '1px solid var(--border-hairline)' }}>
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
          Address(i) = Base + (i &times; ElementSize) &rarr; O(1) Direct Offset Lookup
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{ background: 'var(--coral-soft)', color: 'var(--coral)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontWeight: 600 }}>
            Size: 4 / Cap: 6
          </span>
          <span style={{ background: '#FFFFFF', border: '1px solid var(--border-hairline)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontWeight: 600 }}>
            Amortized Append: O(1)
          </span>
        </div>
      </div>
    </div>
  );
}

export default ConceptDiagram;
