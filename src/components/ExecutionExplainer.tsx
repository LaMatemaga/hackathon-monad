import { useEffect, useRef } from 'react'

const TOTAL_TXS = 40
const THREADS = 8
const ROWS = Math.ceil(TOTAL_TXS / THREADS) // 5

// One full cycle: sequential takes TOTAL_TXS steps, parallel takes ROWS steps
// We normalize to TOTAL_TXS animation units so both panels share a timeline
const STEP_MS = 120  // ms per sequential step → total = 40 * 120 = 4800ms
const LOOP_MS = TOTAL_TXS * STEP_MS + 1200  // +1.2s pause before loop

function SequentialPanel() {
  return (
    <div style={{ flex: 1, padding: '24px 20px', background: '#0a0614', borderRadius: 8, border: '1px solid #1a1430' }}>
      <div style={{ fontFamily: 'Roboto Mono, monospace', marginBottom: 16 }}>
        <div style={{ fontSize: 9, color: '#85E6FF', letterSpacing: 2, marginBottom: 4 }}>ETHEREUM / BNB</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#85E6FF' }}>Sequential</div>
        <div style={{ fontSize: 10, color: '#444', marginTop: 4 }}>One transaction at a time</div>
      </div>

      {/* Single column of 40 boxes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {Array.from({ length: TOTAL_TXS }, (_, i) => (
          <div
            key={i}
            style={{
              height: 10,
              borderRadius: 2,
              background: '#85E6FF',
              opacity: 0.15,
              animation: `seq-light ${LOOP_MS}ms ${i * STEP_MS}ms infinite`,
            }}
          />
        ))}
      </div>

      <div style={{ fontFamily: 'Roboto Mono, monospace', fontSize: 9, color: '#333', marginTop: 12, lineHeight: 1.6 }}>
        Each tx waits for the one before it.<br />
        40 transactions = 40 steps in line.
      </div>
    </div>
  )
}

function ParallelPanel() {
  return (
    <div style={{ flex: 1, padding: '24px 20px', background: '#0c0920', borderRadius: 8, border: '1px solid #6E54FF33' }}>
      <div style={{ fontFamily: 'Roboto Mono, monospace', marginBottom: 16 }}>
        <div style={{ fontSize: 9, color: '#6E54FF', letterSpacing: 2, marginBottom: 4 }}>MONAD</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#6E54FF' }}>Parallel</div>
        <div style={{ fontSize: 10, color: '#444', marginTop: 4 }}>8 threads running at once</div>
      </div>

      {/* 8 columns × 5 rows — each row lights up simultaneously */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {Array.from({ length: ROWS }, (_, rowIdx) => (
          <div key={rowIdx} style={{ display: 'flex', gap: 2 }}>
            {Array.from({ length: THREADS }, (_, colIdx) => {
              const txIdx = rowIdx * THREADS + colIdx
              if (txIdx >= TOTAL_TXS) return <div key={colIdx} style={{ flex: 1, height: 10 }} />
              // Parallel row lights up after rowIdx full sequential batches
              const delayMs = rowIdx * THREADS * STEP_MS
              return (
                <div
                  key={colIdx}
                  style={{
                    flex: 1,
                    height: 10,
                    borderRadius: 2,
                    background: '#6E54FF',
                    opacity: 0.15,
                    animation: `par-light ${LOOP_MS}ms ${delayMs}ms infinite`,
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>

      <div style={{ fontFamily: 'Roboto Mono, monospace', fontSize: 9, color: '#333', marginTop: 12, lineHeight: 1.6 }}>
        Independent txs run simultaneously.<br />
        40 transactions = 5 steps total.
      </div>
    </div>
  )
}

export function ExecutionExplainer() {
  const styleRef = useRef<HTMLStyleElement | null>(null)

  useEffect(() => {
    if (styleRef.current) return
    const style = document.createElement('style')
    style.textContent = `
      @keyframes seq-light {
        0%   { opacity: 0.12; }
        3%   { opacity: 0.9; background: #85E6FF; }
        10%  { opacity: 0.9; }
        18%  { opacity: 0.12; }
        100% { opacity: 0.12; }
      }
      @keyframes par-light {
        0%   { opacity: 0.12; }
        3%   { opacity: 0.85; background: #a08aff; }
        ${(THREADS * STEP_MS / LOOP_MS * 100).toFixed(1)}%  { opacity: 0.85; }
        ${((THREADS * STEP_MS + 300) / LOOP_MS * 100).toFixed(1)}% { opacity: 0.12; }
        100% { opacity: 0.12; }
      }
    `
    document.head.appendChild(style)
    styleRef.current = style
    return () => { style.remove(); styleRef.current = null }
  }, [])

  return (
    <div style={{ width: '100%', padding: '48px 40px 40px' }}>
      <div style={{ fontFamily: 'Roboto Mono, monospace', marginBottom: 32 }}>
        <div style={{ fontSize: 11, color: '#6E54FF', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>
          Execution Model
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#e0d8ff', lineHeight: 1.2 }}>
          Why Monad wins: it runs many lanes at once.
        </div>
        <div style={{ fontSize: 11, color: '#555', marginTop: 8 }}>
          Same 40 transactions. Very different outcomes.
        </div>
      </div>

      {/* Two panels side by side */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        <SequentialPanel />
        <ParallelPanel />
      </div>

      {/* Grocery checkout analogy */}
      <div style={{
        display: 'flex',
        gap: 16,
        fontFamily: 'Roboto Mono, monospace',
        background: '#0a0614',
        border: '1px solid #1a1430',
        borderRadius: 8,
        padding: '16px 20px',
      }}>
        <div style={{ flex: 1, borderRight: '1px solid #1a1430', paddingRight: 16 }}>
          <div style={{ fontSize: 18, marginBottom: 6 }}>🛒</div>
          <div style={{ fontSize: 10, color: '#85E6FF', fontWeight: 700, marginBottom: 4 }}>One checkout lane</div>
          <div style={{ fontSize: 9, color: '#333', lineHeight: 1.6 }}>
            40 customers wait in a single line.<br />
            Each customer waits for everyone ahead.
          </div>
        </div>
        <div style={{ flex: 1, paddingLeft: 16 }}>
          <div style={{ fontSize: 18, marginBottom: 6 }}>🛒🛒🛒🛒🛒🛒🛒🛒</div>
          <div style={{ fontSize: 10, color: '#6E54FF', fontWeight: 700, marginBottom: 4 }}>Eight checkout lanes open</div>
          <div style={{ fontSize: 9, color: '#333', lineHeight: 1.6 }}>
            40 customers split across 8 lanes.<br />
            Everyone is served 8× faster.
          </div>
        </div>
      </div>
    </div>
  )
}
