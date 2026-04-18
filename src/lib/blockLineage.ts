import type { ChainClient } from './rpc'
import { fetchBlockByHash } from './rpc'
import type { RawBlock } from './types'

const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000'

export async function fetchAncestors(
  client: ChainClient,
  startParentHash: `0x${string}`,
  depth = 3
): Promise<RawBlock[]> {
  const ancestors: RawBlock[] = []
  let currentHash = startParentHash

  const timeout = (ms: number) =>
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))

  for (let i = 0; i < depth; i++) {
    if (currentHash === ZERO_HASH) break

    const result = await Promise.race([
      fetchBlockByHash(client, currentHash),
      timeout(3000),
    ])

    if (!result) break
    ancestors.unshift(result)
    currentHash = result.parentHash
  }

  return ancestors
}
