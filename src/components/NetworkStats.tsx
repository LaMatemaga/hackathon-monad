import { useBlockStore } from '../hooks/useBlockStore'
import { CHAINS, CHAIN_ORDER } from '../lib/chains'
import type { ChainId, EnrichedBlock } from '../lib/types'

const EXECUTION_LABEL: Record<ChainId, { symbol: string; text: string }> = {
  monad:    { symbol: '∥', text: 'parallel' },
  ethereum: { symbol: '▷', text: 'sequential' },
  bnb:      { symbol: '▷', text: 'sequential' },
}

const BLOCK_TIME_LABEL: Record<ChainId, string> = {
  monad:    '~0.5s blocks',
  ethereum: '~12s blocks',
  bnb:      '~3s blocks',
}

const MAX_TPS: Record<ChainId, number> = {
  monad:    10_000,
  ethereum: 30,
  bnb:      300,
}

function CapacityBar({ liveTps, maxTps, color }: { liveTps: number; maxTps: number; color: string }) {
  const pct = Math.min(liveTps / maxTps, 1)
  const displayPct = pct < 0.001 ? '<0.1' : (pct * 100).toFixed(1)

  return (
    <div style={{ width: '100%', marginTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Roboto Mono, monospace', marginBottom: 4 }}>
        <div style={{ fontSize: 9, color: '#555', letterSpacing: 1 }}>CAPACITY USED</div>
        <div style={{ fontSize: 9, color: '#555', letterSpacing: 1 }}>{displayPct}%</div>
      </div>
      <div style={{ width: '100%', height: 4, background: '#1a1430', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${Math.max(pct * 100, 0.5)}%`,
          background: color,
          borderRadius: 2,
          boxShadow: `0 0 6px ${color}`,
          transition: 'width 1s ease',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontFamily: 'Roboto Mono, monospace' }}>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 10, color, fontWeight: 600 }}>{liveTps.toLocaleString()}</div>
          <div style={{ fontSize: 7, color: '#333', letterSpacing: 1 }}>LIVE TPS</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: '#444' }}>{maxTps.toLocaleString()}</div>
          <div style={{ fontSize: 7, color: '#333', letterSpacing: 1 }}>MAX TPS</div>
        </div>
      </div>
    </div>
  )
}

function BlocksAheadScoreboard({ blockCount }: { blockCount: Record<ChainId, number> }) {
  const monadCount = blockCount.monad
  const maxCount = Math.max(...CHAIN_ORDER.map((c) => blockCount[c]), 1)
  const ethAhead = blockCount.ethereum > 0 ? Math.round(monadCount / blockCount.ethereum) : null

  return (
    <div style={{
      fontFamily: 'Roboto Mono, monospace',
      padding: '6px 14px',
      border: '1px solid #6E54FF33',
      borderRadius: 6,
      background: 'rgba(14,9,28,0.7)',
      minWidth: 200,
    }}>
      <div style={{ fontSize: 8, color: '#444', letterSpacing: 2, marginBottom: 8 }}>BLOCKS SINCE LOAD</div>

      {CHAIN_ORDER.map((chainId) => {
        const count = blockCount[chainId]
        const pct = count / maxCount
        const color = CHAINS[chainId].color
        const label = CHAINS[chainId].name === 'BNB Chain' ? 'BNB' : CHAINS[chainId].name.toUpperCase()

        return (
          <div key={chainId} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <div style={{ fontSize: 8, color, width: 32, textAlign: 'right', flexShrink: 0 }}>{label}</div>
            <div style={{ flex: 1, height: 4, background: '#1a1430', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                width: `${Math.max(pct * 100, count > 0 ? 1 : 0)}%`,
                height: '100%',
                background: color,
                borderRadius: 2,
                boxShadow: `0 0 4px ${color}`,
                transition: 'width 0.6s ease',
              }} />
            </div>
            <div style={{ fontSize: 9, color, width: 36, textAlign: 'right', fontWeight: 600, flexShrink: 0 }}>
              {count.toLocaleString()}
            </div>
          </div>
        )
      })}

      {ethAhead !== null && ethAhead > 1 && (
        <div style={{ fontSize: 9, color: '#6E54FF', fontWeight: 700, marginTop: 6, letterSpacing: 0.5 }}>
          Monad is {ethAhead.toLocaleString()}× ahead of ETH
        </div>
      )}
    </div>
  )
}

export function NetworkStats() {
  const blocks     = useBlockStore((s) => s.blocks)
  const status     = useBlockStore((s) => s.connectionStatus)
  const totalTxs   = useBlockStore((s) => s.totalTxs)
  const tpsHistory = useBlockStore((s) => s.tpsHistory)
  const blockCount = useBlockStore((s) => s.blockCount)

  const monadTotal = totalTxs.monad
  const ethTotal   = totalTxs.ethereum
  const multiplier = ethTotal > 0 ? Math.round(monadTotal / ethTotal) : null

  return (
    <>
      {/* ── Narrative header ── */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        padding: '12px 24px 10px',
        background: 'linear-gradient(to bottom, rgba(14,9,28,0.95) 70%, transparent)',
        zIndex: 10,
        pointerEvents: 'none',  // children override with pointerEvents:'all' where needed
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <div style={{
              fontFamily: 'Roboto Mono, monospace',
              fontSize: 13,
              fontWeight: 700,
              color: '#6E54FF',
              letterSpacing: 3,
              textTransform: 'uppercase',
            }}>
              Monad's Monad
            </div>
            <a
              href="https://lamatemaga.xyz"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: 'Roboto Mono, monospace',
                fontSize: 9,
                color: '#6E54FF88',
                letterSpacing: 1,
                textDecoration: 'none',
                pointerEvents: 'all',
                borderBottom: '1px solid #6E54FF44',
              }}
            >
              by LaMatemaga
            </a>
          </div>
          <div style={{ fontFamily: 'Roboto Mono, monospace', fontSize: 10, color: '#444', marginTop: 2 }}>
            Each sphere = 1 transaction · Monad runs them all at once · others wait in line
          </div>
        </div>

        {/* Blocks-ahead scoreboard */}
        <BlocksAheadScoreboard blockCount={blockCount} />

        {/* Tx multiplier badge */}
        {multiplier !== null && multiplier > 1 && (
          <div style={{
            fontFamily: 'Roboto Mono, monospace',
            textAlign: 'center',
            padding: '4px 14px',
            border: '1px solid #6E54FF44',
            borderRadius: 6,
            background: '#6E54FF11',
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#6E54FF', lineHeight: 1 }}>
              {multiplier}×
            </div>
            <div style={{ fontSize: 9, color: '#555', marginTop: 2 }}>more txs than ETH</div>
          </div>
        )}
      </div>

      {/* ── Per-chain stats (bottom bar) ── */}
      <div style={{
        position: 'absolute',
        bottom: 36, left: 0, right: 0,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 10,
        pointerEvents: 'none',
      }}>
        {CHAIN_ORDER.map((chainId, idx) => {
          const config  = CHAINS[chainId]
          const s       = status[chainId]
          const isLive  = s === 'live'
          const isMonad = chainId === 'monad'
          const txCount = totalTxs[chainId]
          const latest  = blocks[chainId][0]
          const avgTps  = tpsHistory[chainId].length
            ? Math.round(tpsHistory[chainId].reduce((a: number, b: number) => a + b, 0) / tpsHistory[chainId].length)
            : 0

          // Parallelism: avg threads across retained Monad blocks
          const recentBlocks = blocks[chainId].slice(0, 5).filter((b) => b.raw.transactions.length > 0)
          const avgThreads = isMonad && recentBlocks.length > 0
            ? Math.round(recentBlocks.reduce((sum: number, b: EnrichedBlock) => sum + b.parallelGroups.length, 0) / recentBlocks.length)
            : null

          return (
            <div
              key={chainId}
              style={{
                fontFamily: 'Roboto Mono, monospace',
                textAlign: 'center',
                padding: '12px 28px 10px',
                borderTop: `1px solid ${config.color}${isMonad ? '55' : '22'}`,
                borderLeft: idx > 0 ? '1px solid #ffffff08' : 'none',
                background: isMonad ? '#6E54FF08' : 'rgba(14,9,28,0.6)',
                minWidth: 210,
              }}
            >
              {/* Chain name + execution model */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 6 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: isLive ? config.color : '#333',
                  boxShadow: isLive ? `0 0 6px ${config.color}` : 'none',
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: config.color, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  {config.name}
                </span>
                <span style={{
                  fontSize: 9,
                  color: isMonad ? '#6E54FF' : '#444',
                  background: isMonad ? '#6E54FF22' : '#ffffff08',
                  padding: '1px 6px',
                  borderRadius: 3,
                  letterSpacing: 1,
                }}>
                  {EXECUTION_LABEL[chainId].symbol} {EXECUTION_LABEL[chainId].text}
                </span>
              </div>

              {/* Running tx counter */}
              <div style={{
                fontSize: isMonad ? 34 : 26,
                fontWeight: 700,
                color: isLive ? config.color : '#333',
                lineHeight: 1,
                letterSpacing: -1,
              }}>
                {s === 'connecting' ? '—' : txCount.toLocaleString()}
              </div>
              <div style={{ fontSize: 9, color: '#444', marginTop: 3, letterSpacing: 1 }}>TXS SINCE LOAD</div>

              {/* Block time + tx/block */}
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 14 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#444' }}>{BLOCK_TIME_LABEL[chainId]}</div>
                  <div style={{ fontSize: 7, color: '#333', letterSpacing: 1 }}>BLOCK TIME</div>
                </div>
                {isLive && latest && (
                  <div>
                    <div style={{ fontSize: 10, color: '#444' }}>{latest.raw.transactions.length}</div>
                    <div style={{ fontSize: 7, color: '#333', letterSpacing: 1 }}>TX/BLOCK</div>
                  </div>
                )}
              </div>

              {/* Monad-only: parallel threads badge */}
              {isMonad && avgThreads !== null && avgThreads > 1 && (
                <div style={{
                  marginTop: 10,
                  padding: '5px 10px',
                  border: '1px solid #6E54FF44',
                  borderRadius: 4,
                  background: '#6E54FF0a',
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'center',
                  gap: 6,
                }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#6E54FF', lineHeight: 1 }}>
                    {avgThreads}
                  </div>
                  <div style={{ fontSize: 8, color: '#555', letterSpacing: 1 }}>
                    PARALLEL THREADS/BLOCK
                  </div>
                </div>
              )}

              {/* Capacity bar */}
              <CapacityBar liveTps={isLive ? avgTps : 0} maxTps={MAX_TPS[chainId]} color={config.color} />
            </div>
          )
        })}
      </div>

      {/* ── Bottom hint ── */}
      <div style={{
        position: 'absolute',
        bottom: 12, left: 0, right: 0,
        textAlign: 'center',
        fontFamily: 'Roboto Mono, monospace',
        fontSize: 9,
        color: '#2a2a2a',
        letterSpacing: 1,
        pointerEvents: 'none',
        zIndex: 10,
      }}>
        CLICK A CORE TO INSPECT BLOCK LINEAGE & PARALLEL EXECUTION GROUPS
      </div>
    </>
  )
}
