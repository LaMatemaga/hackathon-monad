import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import type { EnrichedBlock } from '../lib/types'
import { CHAINS } from '../lib/chains'

interface Props {
  block: EnrichedBlock
}

// Consistent scale: show all chains relative to a 12-second window
const COMPARISON_WINDOW_MS = 12_000

export function TxSwimlane({ block }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const color = CHAINS[block.chain].color
  const isMonad = block.chain === 'monad'
  const blockTimeMs = CHAINS[block.chain].blockTimeMs

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const groups = block.parallelGroups
    if (!groups.length) return

    const W = svgRef.current?.clientWidth || 800
    const numGroups = groups.length
    const LANE_H = Math.max(22, Math.min(44, 200 / numGroups))
    const marginL = isMonad ? 90 : 70
    const marginR = 16
    const marginT = 16
    const H = numGroups * LANE_H + marginT + 28
    svgRef.current!.setAttribute('height', String(H))

    // X-axis: same 12-second window for all chains so the scale is comparable.
    // Monad blocks are 0.5s so their bars end at 4% of the width — visually shows speed.
    const xScale = d3.scaleLinear()
      .domain([0, COMPARISON_WINDOW_MS])
      .range([marginL, W - marginR])

    // Block duration marker (vertical line showing where this block actually ends)
    const blockEndX = xScale(blockTimeMs)
    svg.append('line')
      .attr('x1', blockEndX).attr('y1', marginT - 4)
      .attr('x2', blockEndX).attr('y2', H - 24)
      .attr('stroke', color).attr('stroke-opacity', 0.3)
      .attr('stroke-width', 1).attr('stroke-dasharray', '3,3')

    svg.append('text')
      .attr('x', blockEndX + 4).attr('y', marginT + 8)
      .attr('fill', color).attr('fill-opacity', 0.5)
      .attr('font-size', 8).attr('font-family', 'Roboto Mono, monospace')
      .text(`${blockTimeMs >= 1000 ? `${blockTimeMs / 1000}s` : `${blockTimeMs}ms`} block`)

    // Draw lanes
    groups.forEach((group, gi) => {
      const y = marginT + gi * LANE_H
      const laneG = svg.append('g')

      // Lane background
      laneG.append('rect')
        .attr('x', marginL).attr('y', y)
        .attr('width', W - marginL - marginR).attr('height', LANE_H - 2)
        .attr('fill', color).attr('fill-opacity', gi % 2 === 0 ? 0.05 : 0.02)
        .attr('rx', 2)

      // Lane label
      const labelText = isMonad
        ? (numGroups > MAX_VISIBLE_LABEL_THREADS && gi === numGroups - 1
          ? `+${group.transactions.length} more`
          : `T${gi}`)
        : '▷ queue'

      laneG.append('text')
        .attr('x', marginL - 5).attr('y', y + LANE_H / 2 + 4)
        .attr('text-anchor', 'end')
        .attr('fill', color).attr('fill-opacity', 0.6)
        .attr('font-size', 8).attr('font-family', 'Roboto Mono, monospace')
        .text(labelText)

      // Tx rects — laid out proportionally within the thread's estimated duration
      const txs = group.transactions
      if (!txs.length) return

      const totalGroupGas = txs.reduce((s, t) => s + Number(t.gas), 0) || 1
      const groupWidthPx = xScale(group.estimatedDurationMs) - xScale(0)

      let cumX = xScale(0)

      txs.forEach((tx) => {
        const gasFraction = Number(tx.gas) / totalGroupGas
        const txW = Math.max(2, gasFraction * groupWidthPx)
        const isContract = tx.to === null
        const txColor = isContract ? '#FFAE45' : color

        const rect = laneG.append('rect')
          .attr('x', cumX + 1)
          .attr('y', y + 3)
          .attr('width', Math.max(1, txW - 2))
          .attr('height', LANE_H - 8)
          .attr('fill', txColor)
          .attr('fill-opacity', 0.7)
          .attr('rx', 1)
          .style('cursor', 'pointer')

        cumX += txW

        // Tooltip: skip value if 0, show gas instead
        const shortHash = `${tx.hash.slice(0, 8)}...${tx.hash.slice(-6)}`
        const valueWei = BigInt(tx.value ?? 0)
        const hasValue = valueWei > 0n
        const valueStr = hasValue
          ? `value:  ${(Number(valueWei) / 1e18).toFixed(6)} MON`
          : `type:   ${tx.to === null ? 'contract deploy' : 'contract call'}`
        const gasLimit = Number(tx.gas).toLocaleString()
        const gasPrice = tx.gasPrice ? `${(Number(tx.gasPrice) / 1e9).toFixed(2)} gwei` : 'n/a'

        const tipContent = [
          shortHash,
          `from:   ${tx.from.slice(0, 10)}...`,
          `to:     ${tx.to ? tx.to.slice(0, 10) + '...' : 'new contract'}`,
          valueStr,
          `gas:    ${gasLimit}`,
          `price:  ${gasPrice}`,
        ].join('\n')

        rect.on('mouseover', (event: MouseEvent) => {
          d3.select(event.currentTarget as Element).attr('fill-opacity', 1)
          if (tooltipRef.current) {
            tooltipRef.current.style.display = 'block'
            tooltipRef.current.style.left = `${(event as any).offsetX + 12}px`
            tooltipRef.current.style.top = `${(event as any).offsetY - 10}px`
            tooltipRef.current.innerText = tipContent
          }
        })
        rect.on('mouseout', (event: MouseEvent) => {
          d3.select(event.currentTarget as Element).attr('fill-opacity', 0.7)
          if (tooltipRef.current) tooltipRef.current.style.display = 'none'
        })
      })
    })

    // X-axis ticks (0s, 3s, 6s, 9s, 12s)
    const axisY = H - 16
    ;[0, 3000, 6000, 9000, 12000].forEach((ms) => {
      const x = xScale(ms)
      svg.append('line')
        .attr('x1', x).attr('y1', axisY - 4)
        .attr('x2', x).attr('y2', axisY)
        .attr('stroke', '#333').attr('stroke-width', 1)
      svg.append('text')
        .attr('x', x).attr('y', axisY + 8)
        .attr('text-anchor', 'middle')
        .attr('fill', '#333').attr('font-size', 8).attr('font-family', 'Roboto Mono, monospace')
        .text(`${ms / 1000}s`)
    })

    svg.append('line')
      .attr('x1', marginL).attr('y1', axisY - 1)
      .attr('x2', W - marginR).attr('y2', axisY - 1)
      .attr('stroke', '#222').attr('stroke-width', 1)

  }, [block, color, isMonad, blockTimeMs])

  const numThreads = block.parallelGroups.length
  const totalTxs = block.raw.transactions.length

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '4px 16px',
        fontFamily: 'Roboto Mono, monospace',
      }}>
        <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 2 }}>
          Execution model — Block #{Number(block.raw.number).toLocaleString()}
        </div>
        <div style={{ fontSize: 10, color }}>
          {isMonad
            ? `${numThreads} parallel thread${numThreads !== 1 ? 's' : ''} · ${totalTxs} txs`
            : `1 sequential queue · ${totalTxs} txs`}
        </div>
      </div>

      {/* Explanation row */}
      <div style={{
        padding: '0 16px 6px',
        fontFamily: 'Roboto Mono, monospace',
        fontSize: 9,
        color: '#3a3a3a',
      }}>
        {isMonad
          ? 'Each row = one independent execution thread running simultaneously. All threads start at the same time.'
          : 'All transactions wait in a single queue. Each one starts only after the previous one finishes.'}
        {' '}Scale: 0 – 12s (same for all chains).
      </div>

      <div style={{ position: 'relative' }}>
        <svg ref={svgRef} width="100%" height={200} style={{ display: 'block' }} />
        <div
          ref={tooltipRef}
          style={{
            display: 'none',
            position: 'absolute',
            background: '#100c1e',
            border: `1px solid ${color}44`,
            borderRadius: 4,
            padding: '6px 10px',
            fontFamily: 'Roboto Mono, monospace',
            fontSize: 10,
            color: '#aaa',
            whiteSpace: 'pre',
            pointerEvents: 'none',
            zIndex: 10,
            maxWidth: 260,
          }}
        />
      </div>
    </div>
  )
}

const MAX_VISIBLE_LABEL_THREADS = 12
