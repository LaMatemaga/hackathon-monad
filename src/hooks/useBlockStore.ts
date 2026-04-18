import { create } from 'zustand'
import type { EnrichedBlock, BlockLineage, ChainId } from '../lib/types'
import { CHAINS } from '../lib/chains'

export interface TimelinePoint { ts: number; cumulative: number }

interface BlockStore {
  blocks: Record<ChainId, EnrichedBlock[]>
  connectionStatus: Record<ChainId, 'connecting' | 'live' | 'error'>
  selectedBlock: EnrichedBlock | null
  lineage: BlockLineage | null
  tpsHistory: Record<ChainId, number[]>
  totalTxs: Record<ChainId, number>
  txTimeline: Record<ChainId, TimelinePoint[]>
  blockTimeHistory: Record<ChainId, number[]>
  blockCount: Record<ChainId, number>

  addBlock: (block: EnrichedBlock) => void
  setStatus: (chain: ChainId, status: 'connecting' | 'live' | 'error') => void
  selectBlock: (block: EnrichedBlock) => void
  setLineage: (lineage: BlockLineage) => void
  clearSelection: () => void
}

export const useBlockStore = create<BlockStore>((set) => ({
  blocks: { monad: [], ethereum: [], bnb: [] },
  connectionStatus: { monad: 'connecting', ethereum: 'connecting', bnb: 'connecting' },
  selectedBlock: null,
  lineage: null,
  tpsHistory: { monad: [], ethereum: [], bnb: [] },
  totalTxs: { monad: 0, ethereum: 0, bnb: 0 },
  txTimeline: { monad: [], ethereum: [], bnb: [] },
  blockTimeHistory: { monad: [], ethereum: [], bnb: [] },
  blockCount: { monad: 0, ethereum: 0, bnb: 0 },

  addBlock: (block) => set((state) => {
    const max = CHAINS[block.chain].maxBlocksRetained
    const existing = state.blocks[block.chain]
    const updated = [block, ...existing].slice(0, max)
    const tpsHistory = [...(state.tpsHistory[block.chain] ?? []), block.tps].slice(-30)

    const newTotal = state.totalTxs[block.chain] + block.raw.transactions.length
    const newPoint: TimelinePoint = { ts: Date.now(), cumulative: newTotal }
    const timeline = [...state.txTimeline[block.chain], newPoint].slice(-300)

    const prevBlock = existing[0]
    const blockTimeHistory = prevBlock
      ? [...state.blockTimeHistory[block.chain], block.receivedAt - prevBlock.receivedAt].slice(-100)
      : state.blockTimeHistory[block.chain]

    let lineage = state.lineage
    if (
      lineage &&
      lineage.child === null &&
      block.chain === lineage.focal.chain &&
      block.raw.parentHash === lineage.focal.raw.hash
    ) {
      lineage = { ...lineage, child: block }
    }

    return {
      blocks: { ...state.blocks, [block.chain]: updated },
      tpsHistory: { ...state.tpsHistory, [block.chain]: tpsHistory },
      totalTxs: { ...state.totalTxs, [block.chain]: newTotal },
      txTimeline: { ...state.txTimeline, [block.chain]: timeline },
      blockTimeHistory: { ...state.blockTimeHistory, [block.chain]: blockTimeHistory },
      blockCount: { ...state.blockCount, [block.chain]: state.blockCount[block.chain] + 1 },
      lineage,
    }
  }),

  setStatus: (chain, status) => set((state) => ({
    connectionStatus: { ...state.connectionStatus, [chain]: status },
  })),

  selectBlock: (block) => set({ selectedBlock: block }),
  setLineage: (lineage) => set({ lineage }),
  clearSelection: () => set({ selectedBlock: null, lineage: null }),
}))
