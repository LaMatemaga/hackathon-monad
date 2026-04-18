import { defineChain } from 'viem'
import type { ChainConfig } from './types'

export const monadMainnetChain = defineChain({
  id: 143,
  name: 'Monad',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://rpc.monad.xyz'],
      webSocket: ['wss://rpc.monad.xyz'],
    },
  },
})

export const CHAINS: Record<string, ChainConfig> = {
  monad: {
    id: 'monad',
    chainIdNumber: 143,
    name: 'Monad',
    color: '#6E54FF',
    wsUrl: 'wss://rpc.monad.xyz',
    httpUrl: 'https://rpc.monad.xyz',
    blockTimeMs: 500,
    maxBlocksRetained: 30,
  },
  ethereum: {
    id: 'ethereum',
    chainIdNumber: 1,
    name: 'Ethereum',
    color: '#85E6FF',
    wsUrl: 'wss://ethereum-rpc.publicnode.com',
    httpUrl: 'https://ethereum-rpc.publicnode.com',
    blockTimeMs: 12000,
    maxBlocksRetained: 5,
  },
  bnb: {
    id: 'bnb',
    chainIdNumber: 56,
    name: 'BNB Chain',
    color: '#FF8EE4',
    wsUrl: 'wss://bsc-rpc.publicnode.com',
    httpUrl: 'https://bsc-rpc.publicnode.com',
    blockTimeMs: 3000,
    maxBlocksRetained: 10,
  },
}

export const CHAIN_ORDER: Array<keyof typeof CHAINS> = ['monad', 'ethereum', 'bnb']
