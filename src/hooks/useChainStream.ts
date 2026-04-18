import { useEffect, useRef } from 'react'
import type { ChainId } from '../lib/types'
import { CHAINS } from '../lib/chains'
import { createChainClient, subscribeToBlocks } from '../lib/rpc'
import { analyzeBlock } from '../lib/txAnalyzer'
import { useBlockStore } from './useBlockStore'
import type { EnrichedBlock } from '../lib/types'

export function useChainStream(chainId: ChainId) {
  const addBlock = useBlockStore((s) => s.addBlock)
  const setStatus = useBlockStore((s) => s.setStatus)
  const lastBlockTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    const config = CHAINS[chainId]
    const client = createChainClient(chainId)
    let unwatch: (() => void) | null = null
    let mounted = true

    const start = async () => {
      setStatus(chainId, 'connecting')
      try {
        unwatch = await subscribeToBlocks(
          client,
          (rawBlock) => {
            if (!mounted) return

            const now = Date.now()
            const elapsed = now - lastBlockTimeRef.current
            lastBlockTimeRef.current = now

            const parallelGroups = analyzeBlock(rawBlock, chainId)
            const txCount = rawBlock.transactions.length
            const tps = elapsed > 0 ? txCount / (elapsed / 1000) : txCount / (config.blockTimeMs / 1000)

            const totalGroups = parallelGroups.length
            const parallelismRatio = txCount > 0 ? totalGroups / txCount : 0

            const enriched: EnrichedBlock = {
              chain: chainId,
              raw: rawBlock,
              parallelGroups,
              tps: Math.round(tps * 10) / 10,
              parallelismRatio,
              receivedAt: now,
            }

            addBlock(enriched)
            setStatus(chainId, 'live')
          },
          () => {
            if (mounted) setStatus(chainId, 'error')
          }
        )
      } catch {
        if (mounted) setStatus(chainId, 'error')
      }
    }

    start()
    return () => {
      mounted = false
      unwatch?.()
    }
  }, [chainId, addBlock, setStatus])
}
