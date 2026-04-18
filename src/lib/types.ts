export type ChainId = 'monad' | 'ethereum' | 'bnb'

export interface ChainConfig {
  id: ChainId
  chainIdNumber: number
  name: string
  color: string
  wsUrl: string
  httpUrl: string
  blockTimeMs: number
  maxBlocksRetained: number
}

export interface RawTransaction {
  hash: `0x${string}`
  from: `0x${string}`
  to: `0x${string}` | null
  value: bigint
  gas: bigint
  gasPrice: bigint | null
  maxFeePerGas: bigint | null
  nonce: number
  input: `0x${string}`
  blockNumber: bigint
  transactionIndex: number
}

export interface RawBlock {
  hash: `0x${string}`
  number: bigint
  parentHash: `0x${string}`
  timestamp: bigint
  transactions: RawTransaction[]
  gasUsed: bigint
  gasLimit: bigint
  miner: `0x${string}`
}

export interface AnalyzedTransaction extends RawTransaction {
  parallelGroupId: number
  conflictsWith: `0x${string}`[]
}

export interface ParallelGroup {
  groupId: number
  transactions: AnalyzedTransaction[]
  estimatedStartMs: number
  estimatedDurationMs: number
}

export interface EnrichedBlock {
  chain: ChainId
  raw: RawBlock
  parallelGroups: ParallelGroup[]
  tps: number
  parallelismRatio: number
  receivedAt: number
}

export interface BlockLineage {
  ancestors: EnrichedBlock[]
  focal: EnrichedBlock
  child: EnrichedBlock | null
}
