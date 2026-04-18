import { createPublicClient, webSocket, http } from 'viem'
import { mainnet, bsc } from 'viem/chains'
import { monadMainnetChain, CHAINS } from './chains'

import type { ChainId, RawBlock } from './types'

function getViemChain(chainId: ChainId) {
  if (chainId === 'monad') return monadMainnetChain
  if (chainId === 'ethereum') return mainnet
  return bsc
}

export function createChainClient(chainId: ChainId) {
  const config = CHAINS[chainId]
  const chain = getViemChain(chainId)

  try {
    return createPublicClient({
      chain,
      transport: webSocket(config.wsUrl, {
        reconnect: { delay: 1000, attempts: 10 },
        keepAlive: { interval: 15_000 },
      }),
    })
  } catch {
    // fallback to HTTP polling if WS fails
    return createPublicClient({
      chain,
      transport: http(config.httpUrl),
    })
  }
}

export type ChainClient = ReturnType<typeof createChainClient>

export async function subscribeToBlocks(
  client: ChainClient,
  onBlock: (block: RawBlock) => void,
  onError?: (err: Error) => void
): Promise<() => void> {
  const unwatch = client.watchBlocks({
    includeTransactions: true,
    onBlock: (block) => onBlock(block as unknown as RawBlock),
    onError: (err) => {
      console.warn('[rpc] block stream error:', err)
      onError?.(err)
    },
  })
  return unwatch
}

export async function fetchBlockByHash(
  client: ChainClient,
  hash: `0x${string}`
): Promise<RawBlock | null> {
  try {
    const block = await client.getBlock({ blockHash: hash, includeTransactions: true })
    return block as unknown as RawBlock
  } catch {
    return null
  }
}

export async function fetchBlockByNumber(
  client: ChainClient,
  blockNumber: bigint
): Promise<RawBlock | null> {
  try {
    const block = await client.getBlock({ blockNumber, includeTransactions: true })
    return block as unknown as RawBlock
  } catch {
    return null
  }
}
