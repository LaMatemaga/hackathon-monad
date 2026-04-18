import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { useBlockStore } from '../hooks/useBlockStore'
import { CHAINS } from '../lib/chains'
import type { ChainId } from '../lib/types'

const CHAIN_ORDER: ChainId[] = ['monad', 'ethereum', 'bnb']

export function TransactionRace() {
  const txTimeline = useBlockStore((s) => s.txTimeline)
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const W = containerRef.current?.clientWidth || 800
    const H = 320
    const marginL = 60
    const marginR = 90
    const marginT = 24
    const marginB = 36

    const allPoints = CHAIN_ORDER.flatMap((c) => txTimeline[c])
    if (allPoints.length < 2) return

    const startTs = Math.min(...allPoints.map((p) => p.ts))
    const endTs = Math.max(...allPoints.map((p) => p.ts))
    const maxCumulative = Math.max(...allPoints.map((p) => p.cumulative), 100)

    const xScale = d3.scaleLinear()
      .domain([0, endTs - startTs])
      .range([marginL, W - marginR])

    const yScale = d3.scaleLinear()
      .domain([0, maxCumulative * 1.08])
      .range([H - marginB, marginT])

    // Grid lines
    const yTicks = yScale.ticks(5)
    yTicks.forEach((t) => {
      svg.append('line')
        .attr('x1', marginL).attr('x2', W - marginR)
        .attr('y1', yScale(t)).attr('y2', yScale(t))
        .attr('stroke', '#1a1430').attr('stroke-width', 1)
    })

    // Draw each chain
    CHAIN_ORDER.forEach((chainId) => {
      const pts = txTimeline[chainId]
      if (pts.length < 2) return
      const color = CHAINS[chainId].color
      const isMonad = chainId === 'monad'

      const mapped = pts.map((p) => ({ x: p.ts - startTs, y: p.cumulative }))

      if (isMonad) {
        const area = d3.area<{ x: number; y: number }>()
          .x((d) => xScale(d.x))
          .y0(H - marginB)
          .y1((d) => yScale(d.y))
          .curve(d3.curveMonotoneX)

        svg.append('path')
          .datum(mapped)
          .attr('d', area)
          .attr('fill', color)
          .attr('fill-opacity', 0.15)
      }

      const line = d3.line<{ x: number; y: number }>()
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y))
        .curve(d3.curveMonotoneX)

      svg.append('path')
        .datum(mapped)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', isMonad ? 2.5 : 1.5)
        .attr('stroke-opacity', isMonad ? 1 : 0.7)

      // Label at end of line
      const last = mapped[mapped.length - 1]
      svg.append('text')
        .attr('x', xScale(last.x) + 6)
        .attr('y', yScale(last.y) + 4)
        .attr('fill', color)
        .attr('font-size', 9)
        .attr('font-family', 'Roboto Mono, monospace')
        .attr('font-weight', isMonad ? 700 : 400)
        .text(CHAINS[chainId].name.toUpperCase())
    })

    // Y axis
    svg.append('g')
      .attr('transform', `translate(${marginL}, 0)`)
      .call(
        d3.axisLeft(yScale)
          .ticks(5)
          .tickFormat((d) => {
            const n = Number(d)
            return n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n)
          })
      )
      .call((g) => {
        g.select('.domain').remove()
        g.selectAll('line').attr('stroke', '#333')
        g.selectAll('text').attr('fill', '#444').attr('font-size', 9).attr('font-family', 'Roboto Mono, monospace')
      })

    // X axis
    const xAxis = d3.axisBottom(xScale)
      .ticks(6)
      .tickFormat((d) => `${(Number(d) / 1000).toFixed(0)}s`)

    svg.append('g')
      .attr('transform', `translate(0, ${H - marginB})`)
      .call(xAxis)
      .call((g) => {
        g.select('.domain').attr('stroke', '#222')
        g.selectAll('line').attr('stroke', '#333')
        g.selectAll('text').attr('fill', '#444').attr('font-size', 9).attr('font-family', 'Roboto Mono, monospace')
      })

    // Y label
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -(H / 2))
      .attr('y', 14)
      .attr('text-anchor', 'middle')
      .attr('fill', '#333')
      .attr('font-size', 9)
      .attr('font-family', 'Roboto Mono, monospace')
      .attr('letter-spacing', 1)
      .text('CUMULATIVE TXS')

  }, [txTimeline])

  const monadCount = txTimeline.monad.length
  const ethCount = txTimeline.ethereum.length
  const hasData = monadCount >= 2 || ethCount >= 2

  return (
    <div ref={containerRef} style={{ width: '100%', padding: '48px 40px 40px' }}>
      <div style={{ fontFamily: 'Roboto Mono, monospace', marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: '#6E54FF', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>
          Transaction Race
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#e0d8ff', lineHeight: 1.2 }}>
          The gap widens as you watch.
        </div>
        <div style={{ fontSize: 11, color: '#555', marginTop: 8 }}>
          Cumulative transactions processed since page load. Each chain running live.
        </div>
      </div>

      {!hasData ? (
        <div style={{
          height: 320,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Roboto Mono, monospace',
          fontSize: 11,
          color: '#333',
          letterSpacing: 1,
          border: '1px solid #1a1430',
          borderRadius: 4,
        }}>
          COLLECTING DATA... ({monadCount} Monad blocks, {ethCount} ETH blocks)
        </div>
      ) : (
        <svg ref={svgRef} width="100%" height={320} style={{ display: 'block', overflow: 'visible' }} />
      )}
    </div>
  )
}
