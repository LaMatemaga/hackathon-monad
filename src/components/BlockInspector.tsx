import { useEffect, useRef } from 'react'
import { useBlockStore } from '../hooks/useBlockStore'
import { createChainClient } from '../lib/rpc'
import { analyzeBlock } from '../lib/txAnalyzer'
import { fetchAncestors } from '../lib/blockLineage'
import { BlockLineage } from './BlockLineage'
import { TxSwimlane } from './TxSwimlane'
import { CHAINS } from '../lib/chains'
import type { EnrichedBlock } from '../lib/types'

export function BlockInspector() {
  const selectedBlock = useBlockStore((s) => s.selectedBlock)
  const lineage = useBlockStore((s) => s.lineage)
  const clearSelection = useBlockStore((s) => s.clearSelection)
  const setLineage = useBlockStore((s) => s.setLineage)

  const clientsRef = useRef<Record<string, ReturnType<typeof createChainClient>>>({})

  function getClient(chainId: string) {
    if (!clientsRef.current[chainId]) {
      clientsRef.current[chainId] = createChainClient(chainId as any)
    }
    return clientsRef.current[chainId]
  }

  useEffect(() => {
    if (!selectedBlock) return

    const client = getClient(selectedBlock.chain)

    async function loadLineage() {
      const ancestors = await fetchAncestors(client, selectedBlock!.raw.parentHash, 3)

      const enrichedAncestors: EnrichedBlock[] = ancestors.map((raw) => ({
        chain: selectedBlock!.chain,
        raw,
        parallelGroups: analyzeBlock(raw, selectedBlock!.chain),
        tps: 0,
        parallelismRatio: 0,
        receivedAt: Date.now(),
      }))

      setLineage({ ancestors: enrichedAncestors, focal: selectedBlock!, child: null })
    }

    loadLineage()
  }, [selectedBlock, setLineage])

  const isOpen = !!selectedBlock
  const color = selectedBlock ? CHAINS[selectedBlock.chain].color : '#6E54FF'

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: isOpen ? '42vh' : 0,
        background: 'rgba(10, 6, 22, 0.97)',
        borderTop: isOpen ? `1px solid ${color}44` : 'none',
        transition: 'height 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {isOpen && (
        <>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 16px',
            borderBottom: `1px solid ${color}22`,
          }}>
            <span style={{
              fontFamily: 'Roboto Mono, monospace',
              fontSize: 11,
              color,
              textTransform: 'uppercase',
              letterSpacing: 2,
            }}>
              Block Inspector
            </span>
            <button
              onClick={clearSelection}
              style={{
                background: 'none',
                border: `1px solid ${color}44`,
                color: '#666',
                fontFamily: 'Roboto Mono, monospace',
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 3,
                cursor: 'pointer',
              }}
            >
              close ✕
            </button>
          </div>

          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
            {lineage ? (
              <>
                <BlockLineage
                  ancestors={lineage.ancestors}
                  focal={lineage.focal}
                  child={lineage.child}
                />
                <div style={{ height: 1, background: `${color}22`, margin: '4px 8px' }} />
                <TxSwimlane block={lineage.focal} />
              </>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                fontFamily: 'Roboto Mono, monospace',
                fontSize: 11,
                color: '#444',
              }}>
                loading lineage...
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
