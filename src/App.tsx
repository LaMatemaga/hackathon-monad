import { useChainStream } from './hooks/useChainStream'
import { UniverseScene } from './components/UniverseScene'
import { NetworkStats } from './components/NetworkStats'
import { BlockInspector } from './components/BlockInspector'
import { ScrollContent } from './components/ScrollContent'

export default function App() {
  useChainStream('monad')
  useChainStream('ethereum')
  useChainStream('bnb')

  return (
    <>
      {/* Scroll root */}
      <div style={{ width: '100%' }}>
        {/* 3D panel — fills exactly one viewport */}
        <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
          <UniverseScene />
          <NetworkStats />

          {/* Scroll hint */}
          <div style={{
            position: 'absolute',
            bottom: 12,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: 'Roboto Mono, monospace',
            fontSize: 10,
            color: '#333',
            pointerEvents: 'none',
            zIndex: 5,
            letterSpacing: 1,
          }}>
            ↓ scroll to explore
          </div>
        </div>

        {/* Story sections */}
        <ScrollContent />
      </div>

      {/* Block inspector — always fixed, outside scroll flow */}
      <BlockInspector />
    </>
  )
}
