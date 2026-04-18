import { TransactionRace } from './TransactionRace'
import { ExecutionExplainer } from './ExecutionExplainer'
import { BlockDistribution } from './BlockDistribution'

const DIVIDER = (
  <div style={{ width: '100%', height: 1, background: 'linear-gradient(to right, transparent, #1a1430, transparent)' }} />
)

export function ScrollContent() {
  return (
    <div style={{ background: '#080512', width: '100%' }}>
      {DIVIDER}
      <TransactionRace />
      {DIVIDER}
      <ExecutionExplainer />
      {DIVIDER}
      <BlockDistribution />
    </div>
  )
}
