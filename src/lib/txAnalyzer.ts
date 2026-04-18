import type { ChainId, RawBlock, RawTransaction, AnalyzedTransaction, ParallelGroup } from './types'
import { CHAINS } from './chains'

const MAX_DISPLAY_TXS = 80
const MAX_VISIBLE_THREADS = 12

function sampleTransactions(txs: RawTransaction[]): RawTransaction[] {
  if (txs.length <= MAX_DISPLAY_TXS) return txs
  const step = txs.length / MAX_DISPLAY_TXS
  return Array.from({ length: MAX_DISPLAY_TXS }, (_, i) => txs[Math.floor(i * step)])
}

export function analyzeBlock(block: RawBlock, chainId: ChainId): ParallelGroup[] {
  const txs = sampleTransactions(block.transactions)
  const blockTimeMs = CHAINS[chainId].blockTimeMs

  if (txs.length === 0) {
    return [{ groupId: 0, transactions: [], estimatedStartMs: 0, estimatedDurationMs: blockTimeMs }]
  }

  // Sequential chains: all txs in a single ordered queue
  if (chainId === 'ethereum' || chainId === 'bnb') {
    return [{
      groupId: 0,
      transactions: txs.map((tx) => ({ ...tx, parallelGroupId: 0, conflictsWith: [] })),
      estimatedStartMs: 0,
      estimatedDurationMs: blockTimeMs,
    }]
  }

  // Monad: each unique sender address = one parallel execution thread.
  // Txs from the same sender must be sequential (nonce ordering).
  // Txs from different senders are fully independent — they run in parallel.
  const bySender = new Map<string, RawTransaction[]>()
  for (const tx of txs) {
    const arr = bySender.get(tx.from) ?? []
    arr.push(tx)
    bySender.set(tx.from, arr)
  }

  // Sort senders by tx count descending so biggest threads appear first
  const senderGroups = [...bySender.entries()].sort((a, b) => b[1].length - a[1].length)

  // Collapse into MAX_VISIBLE_THREADS if there are too many unique senders
  let threadBuckets: RawTransaction[][]
  if (senderGroups.length <= MAX_VISIBLE_THREADS) {
    threadBuckets = senderGroups.map(([, t]) => t)
  } else {
    threadBuckets = senderGroups.slice(0, MAX_VISIBLE_THREADS - 1).map(([, t]) => t)
    const overflow = senderGroups.slice(MAX_VISIBLE_THREADS - 1).flatMap(([, t]) => t)
    threadBuckets.push(overflow)
  }

  // Compute max gas across all threads — used for proportional duration
  const threadGas = threadBuckets.map((t) => t.reduce((s, tx) => s + Number(tx.gas), 0))
  const maxThreadGas = Math.max(...threadGas, 1)

  return threadBuckets.map((bucket, groupId) => {
    const analyzed: AnalyzedTransaction[] = bucket.map((tx) => ({
      ...tx,
      parallelGroupId: groupId,
      // Conflicts = other txs from the same sender (sequential within thread)
      conflictsWith: bucket.filter((t) => t.hash !== tx.hash).map((t) => t.hash),
    }))

    // Thread duration proportional to its gas share vs the heaviest thread
    const estimatedDurationMs = (threadGas[groupId] / maxThreadGas) * blockTimeMs

    return {
      groupId,
      transactions: analyzed,
      estimatedStartMs: 0, // all threads start simultaneously
      estimatedDurationMs,
    }
  })
}
